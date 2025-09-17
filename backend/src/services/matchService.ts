// backend/src/services/matchService.ts

import prisma from "../utils/prisma";
import {
  GameStage,
  MatchEventType,
  SaveGameMatch,
  MatchState,
  MatchdayType,
} from "@prisma/client";
import { simulateMatch, type SimulatedMatchEvent } from "../engine/simulateMatch";
import { ensureMatchState } from "./matchStateService";
import {
  broadcastMatchEvent,
  broadcastMatchTick,
  broadcastStageChanged,
  broadcastPauseRequest,
  broadcastPenaltyAwarded,
  type PauseReason,
} from "../sockets/broadcast";
// ⬇️ PK integration
import {
  simulateShootout as simulatePenaltyShootout,
  resolveMatchPenalty,
} from "./penaltyService";
import { maybeAwardPenalty } from "../engine/simulateMatch";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

// ~1.5 real-time minutes for 90' → ~1s per simulated minute (tune to taste)
const TICK_MS = 125;

/* -------------------------------------------------------------------------- */
/* In-memory control for pause/stop                                           */
/* -------------------------------------------------------------------------- */

const pausedSaves = new Set<number>();
const stoppedSaves = new Set<number>();

export async function pauseMatchday(saveGameId: number) {
  pausedSaves.add(saveGameId);
}
export async function stopMatchday(saveGameId: number) {
  stoppedSaves.add(saveGameId);
  pausedSaves.delete(saveGameId);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getActiveMatchday(saveGameId: number) {
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { currentMatchday: true, gameStage: true, coachTeamId: true },
  });
  if (!gs || typeof gs.currentMatchday !== "number") {
    throw new Error(`No currentMatchday for save ${saveGameId}`);
  }

  const md = await prisma.matchday.findFirst({
    where: { saveGameId, number: gs.currentMatchday },
    include: {
      saveGameMatches: {
        select: {
          id: true,
          homeGoals: true,
          awayGoals: true,
          isPlayed: true,
          homeTeamId: true,
          awayTeamId: true,
        },
      },
    },
  });
  if (!md) throw new Error(`Matchday not found for save=${saveGameId}`);

  const mdTypeRow = await prisma.matchday.findFirst({
    where: { saveGameId, number: gs.currentMatchday },
    select: { type: true },
  });

  return {
    md: { ...md, type: mdTypeRow?.type ?? MatchdayType.LEAGUE },
    coachTeamId: gs.coachTeamId ?? null,
  };
}

async function getOrCreateMatchState(matchId: number) {
  let st = await prisma.matchState.findUnique({ where: { saveGameMatchId: matchId } });
  if (!st) st = await ensureMatchState(matchId);
  return st as MatchState;
}

/** 🔧 Remove a player from BOTH lineup and reserves (no re-entry this match). */
async function removePlayerFromSquad(
  matchId: number,
  playerId: number,
  isHomeTeam: boolean
): Promise<void> {
  const state = await prisma.matchState.findUnique({ where: { saveGameMatchId: matchId } });
  if (!state) return;

  if (isHomeTeam) {
    const newLineup = (state.homeLineup ?? []).filter((id) => id !== playerId);
    const newBench  = (state.homeReserves ?? []).filter((id) => id !== playerId);
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: { homeLineup: newLineup, homeReserves: newBench },
    });
  } else {
    const newLineup = (state.awayLineup ?? []).filter((id) => id !== playerId);
    const newBench  = (state.awayReserves ?? []).filter((id) => id !== playerId);
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: { awayLineup: newLineup, awayReserves: newBench },
    });
  }
}

/** Increment the score immediately when a GOAL happens so tick reflects it. */
async function updateScoreForGoal(
  matchId: number,
  isHomeTeam: boolean
): Promise<{ homeGoals: number; awayGoals: number }> {
  const match = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { homeGoals: true, awayGoals: true },
  });
  const homeGoals = (match?.homeGoals ?? 0) + (isHomeTeam ? 1 : 0);
  const awayGoals = (match?.awayGoals ?? 0) + (!isHomeTeam ? 1 : 0);
  await prisma.saveGameMatch.update({
    where: { id: matchId },
    data: { homeGoals, awayGoals },
  });
  return { homeGoals, awayGoals };
}

/**
 * Best-effort resolution of which side an event belongs to.
 * Prefer SimulatedMatchEvent.isHomeTeam when present; otherwise infer from player.teamId.
 */
async function resolveIsHomeTeam(
  e: SimulatedMatchEvent,
  match: { homeTeamId: number; awayTeamId: number }
): Promise<boolean | null> {
  if (typeof e.isHomeTeam === "boolean") return e.isHomeTeam;
  if (e.saveGamePlayerId) {
    const p = await prisma.saveGamePlayer.findUnique({
      where: { id: e.saveGamePlayerId },
      select: { teamId: true },
    });
    if (p) {
      if (p.teamId === match.homeTeamId) return true;
      if (p.teamId === match.awayTeamId) return false;
    }
  }
  return null;
}

/** Persist + broadcast events (adds isHomeTeam for optimistic FE). */
async function persistAndBroadcastEvents(
  saveGameId: number,
  match: SaveGameMatch & { homeTeamId: number; awayTeamId: number },
  simulated: SimulatedMatchEvent[]
) {
  if (!simulated.length) return;

  await prisma.$transaction(
    simulated.map((e) =>
      prisma.matchEvent.create({
        data: {
          saveGameMatchId: match.id,
          minute: e.minute,
          type: e.type,
          description: e.description,
          saveGamePlayerId: e.saveGamePlayerId ?? null,
        },
      })
    )
  );

  for (const e of simulated) {
    let player: { id: number; name: string } | null = null;
    try {
      if (e.saveGamePlayerId) {
        const p = await prisma.saveGamePlayer.findUnique({
          where: { id: e.saveGamePlayerId },
          select: { id: true, name: true },
        });
        if (p) player = { id: p.id, name: p.name };
      }
    } catch {
      /* ignore */
    }

    const isHomeTeam = await resolveIsHomeTeam(e, match);

    // NOTE: broadcastMatchEvent signature is (saveGameId, payload)
    broadcastMatchEvent(saveGameId, {
      matchId: match.id,
      minute: e.minute,
      type: e.type,
      description: e.description,
      player,
      ...(typeof isHomeTeam === "boolean" ? { isHomeTeam } : {}),
    });
  }
}

/* ----------------------------------------------------------------------------
   Maintain matchState.isPaused for all matches in a matchday while paused
---------------------------------------------------------------------------- */
async function setMatchdayPausedFlag(saveGameId: number, mdNumber: number, paused: boolean) {
  const md = await prisma.matchday.findFirst({
    where: { saveGameId, number: mdNumber },
    select: { id: true, saveGameMatches: { select: { id: true } } },
  });
  if (!md) return;
  const ids = md.saveGameMatches.map((m) => m.id);
  if (!ids.length) return;

  await prisma.matchState.updateMany({
    where: { saveGameMatchId: { in: ids } },
    data: { isPaused: paused },
  });
}

/**
 * Pause entire matchday loop (used at HT, injury-pause for coached team, GK red).
 * Waits until GameState.gameStage flips back to MATCHDAY or a hard stop occurs.
 */
async function pauseUntilResumed(saveGameId: number, mdNumber: number) {
  if (!pausedSaves.has(saveGameId)) {
    pausedSaves.add(saveGameId);

    await prisma.gameState.updateMany({
      where: { currentSaveGameId: saveGameId },
      data: { gameStage: GameStage.HALFTIME },
    });
    await setMatchdayPausedFlag(saveGameId, mdNumber, true);

    // NOTE: broadcastStageChanged signature is (payload, saveGameId)
    broadcastStageChanged({ gameStage: "HALFTIME", matchdayNumber: mdNumber }, saveGameId);
  }

  const started = Date.now();
  while (true) {
    if (stoppedSaves.has(saveGameId)) return;
    const gs = await prisma.gameState.findFirst({
      where: { currentSaveGameId: saveGameId },
      select: { gameStage: true },
    });
    if (gs?.gameStage === GameStage.MATCHDAY) break;
    if (Date.now() - started > 120_000) break; // safety escape ~2min
    await sleep(400);
  }

  broadcastStageChanged({ gameStage: "MATCHDAY", matchdayNumber: mdNumber }, saveGameId);
  pausedSaves.delete(saveGameId);
  await setMatchdayPausedFlag(saveGameId, mdNumber, false);
}

/* Honor external (FE) coach-pause via set-stage:HALFTIME */
async function checkAndHonorExternalPause(saveGameId: number, mdNumber: number) {
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { gameStage: true },
  });
  if (gs?.gameStage === GameStage.HALFTIME && !pausedSaves.has(saveGameId)) {
    await pauseUntilResumed(saveGameId, mdNumber);
  }
}

/* -------------------------------------------------------------------------- */
/* CUP helpers: ET (91–120) + Penalties                                       */
/* -------------------------------------------------------------------------- */

async function simulateExtraTimeForMatch(
  saveGameId: number,
  matchId: number,
  match: { id: number; homeTeamId: number; awayTeamId: number },
  startingMinute = 90
): Promise<{ homeGoals: number; awayGoals: number }> {
  let latest = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { homeGoals: true, awayGoals: true },
  });
  let homeGoals = latest?.homeGoals ?? 0;
  let awayGoals = latest?.awayGoals ?? 0;

  const mdRow = await prisma.matchday.findFirst({
    where: { saveGameId, saveGameMatches: { some: { id: matchId } } },
    select: { number: true },
  });
  const mdNumber = mdRow?.number ?? 0;

  for (let minute = startingMinute + 1; minute <= 120; minute++) {
    if (stoppedSaves.has(saveGameId)) break;

    await checkAndHonorExternalPause(saveGameId, mdNumber);
    while (pausedSaves.has(saveGameId)) {
      if (stoppedSaves.has(saveGameId)) break;
      await sleep(200);
    }

    // ET half-time at 105' (only for the coached team's match)
    if (minute === 105) {
      const gs = await prisma.gameState.findFirst({
        where: { currentSaveGameId: saveGameId },
        select: { coachTeamId: true },
      });
      const coachTeamId = gs?.coachTeamId ?? null;
      const coachedInvolved =
        !!coachTeamId &&
        (match.homeTeamId === coachTeamId || match.awayTeamId === coachTeamId);
      if (coachedInvolved) {
        const isHomeTeam = match.homeTeamId === coachTeamId;
        broadcastPauseRequest(
          {
            matchId,
            isHomeTeam,
            reason: "ET_HALF" as PauseReason,
          },
          saveGameId
        );
        await pauseUntilResumed(saveGameId, mdNumber);
      }
    }

    const state = await getOrCreateMatchState(matchId);

    /* ------------------------------------------------------------------
     * Penalty-awarded branch (ET)
     * ------------------------------------------------------------------ */
    {
      const pseudoMatch = {
        ...match,
        homeGoals,
        awayGoals,
      } as unknown as SaveGameMatch;

      const pen = await maybeAwardPenalty(pseudoMatch, state, minute);
      if (pen) {
        const gs = await prisma.gameState.findFirst({
          where: { currentSaveGameId: saveGameId },
          select: { coachTeamId: true },
        });
        const coachTeamId = gs?.coachTeamId ?? null;

        const isCoached =
          !!coachTeamId &&
          ((pen.isHomeTeam && match.homeTeamId === coachTeamId) ||
            (!pen.isHomeTeam && match.awayTeamId === coachTeamId));

        if (isCoached) {
          broadcastPenaltyAwarded(saveGameId, {
            matchId,
            minute,
            isHomeTeam: pen.isHomeTeam,
            candidates: pen.candidates.map((p) => ({
              id: p.id,
              name: p.name,
              position: p.position ?? undefined,
              rating: p.rating ?? undefined,
            })), 
            defaultShooterId: pen.defaultShooterId ?? undefined,
          });

          await pauseUntilResumed(saveGameId, mdNumber);

          const after = await prisma.saveGameMatch.findUnique({
            where: { id: matchId },
            select: { homeGoals: true, awayGoals: true },
          });
          homeGoals = after?.homeGoals ?? homeGoals;
          awayGoals = after?.awayGoals ?? awayGoals;
        } else {
          const shooterId = pen.defaultShooterId ?? pen.candidates[0]?.id ?? null;
          if (shooterId) {
            const result = await resolveMatchPenalty({
              matchId,
              shooterId,
              isHome: pen.isHomeTeam,
            });
            homeGoals = result.homeGoals;
            awayGoals = result.awayGoals;
          }
        }
      }
    }

    const simEventsRaw = await simulateMatch(
      match as SaveGameMatch & { homeTeamId: number; awayTeamId: number },
      state,
      minute
    );

    const sentOffIds = new Set<number>(
      simEventsRaw
        .filter((e) => e.type === MatchEventType.RED && typeof e.saveGamePlayerId === "number")
        .map((e) => e.saveGamePlayerId!)
    );
    const simEvents = simEventsRaw.filter(
      (e) => !(e.type === MatchEventType.GOAL && sentOffIds.has(e.saveGamePlayerId!))
    );

    for (const e of simEvents) {
      if (e.type === MatchEventType.GOAL) {
        const isHome = (await resolveIsHomeTeam(e, match)) ?? true;
        const score = await updateScoreForGoal(matchId, isHome);
        homeGoals = score.homeGoals;
        awayGoals = score.awayGoals;
      }
    }

    // RED → immediate discard from lineup & bench; GK red triggers pause if coached
    for (const e of simEvents) {
      if (e.type === MatchEventType.RED && typeof e.saveGamePlayerId === "number") {
        const isHome = (await resolveIsHomeTeam(e, match)) ?? true;
        await removePlayerFromSquad(matchId, e.saveGamePlayerId!, isHome);

        const p = await prisma.saveGamePlayer.findUnique({
          where: { id: e.saveGamePlayerId! },
          select: { name: true, position: true, rating: true, teamId: true },
        });
        const isGK =
          (p?.position ?? "").toUpperCase() === "GK" ||
          (p?.position ?? "").toUpperCase() === "GOALKEEPER";
        if (isGK) {
          const pausePayload = {
            matchId,
            isHomeTeam: isHome,
            reason: "GK_RED_NEEDS_GK" as PauseReason,
            player: p
              ? { id: e.saveGamePlayerId!, name: p.name, position: p.position ?? "GK", rating: p.rating ?? undefined }
              : undefined,
          };
          broadcastPauseRequest(pausePayload, saveGameId);

          const gs = await prisma.gameState.findFirst({
            where: { currentSaveGameId: saveGameId },
            select: { coachTeamId: true },
          });
          const coachTeamId = gs?.coachTeamId ?? null;
          if (
            coachTeamId &&
            ((isHome && match.homeTeamId === coachTeamId) || (!isHome && match.awayTeamId === coachTeamId))
          ) {
            await pauseUntilResumed(saveGameId, mdNumber);
          }
        }
      }
    }

    // INJURY → coach decision; pause if coached (do not auto-remove here)
    for (const e of simEvents) {
      if (e.type === MatchEventType.INJURY) {
        const isHome = (await resolveIsHomeTeam(e, match)) ?? true;
        const p = await prisma.saveGamePlayer.findUnique({
          where: { id: e.saveGamePlayerId! },
          select: { name: true, position: true, rating: true, teamId: true },
        });

        const pausePayload = {
          matchId,
          isHomeTeam: isHome,
          reason: "INJURY" as PauseReason,
          player: p
            ? { id: e.saveGamePlayerId!, name: p.name, position: p.position ?? "MF", rating: p.rating ?? undefined }
            : undefined,
        };
        broadcastPauseRequest(pausePayload, saveGameId);

        const gs = await prisma.gameState.findFirst({
          where: { currentSaveGameId: saveGameId },
          select: { coachTeamId: true },
        });
        const coachTeamId = gs?.coachTeamId ?? null;
        if (
          coachTeamId &&
          ((isHome && match.homeTeamId === coachTeamId) || (!isHome && match.awayTeamId === coachTeamId))
        ) {
          await pauseUntilResumed(saveGameId, mdNumber);
        }
      }
    }

    await persistAndBroadcastEvents(saveGameId, match as any, simEvents);

    broadcastMatchTick(saveGameId, {
      matchId,
      minute,
      homeGoals,
      awayGoals,
      id: matchId, // legacy key
      phase: "ET",
    });

    await sleep(TICK_MS);
  }

  return { homeGoals, awayGoals };
}

/* -------------------------------------------------------------------------- */
/* Emergency shootout resolver (error-proof AI vs AI)                          */
/* -------------------------------------------------------------------------- */

async function emergencyDecideWinner(matchId: number): Promise<void> {
  const base = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { homeGoals: true, awayGoals: true },
  });
  const winnerHome = Math.random() < 0.5;
  const updatedHome = (base?.homeGoals ?? 0) + (winnerHome ? 1 : 0);
  const updatedAway = (base?.awayGoals ?? 0) + (!winnerHome ? 1 : 0);
  await prisma.saveGameMatch.update({
    where: { id: matchId },
    data: { homeGoals: updatedHome, awayGoals: updatedAway, isPlayed: true },
  });
}

async function safeResolveShootout(
  saveGameId: number,
  match: { id: number; homeTeamId: number; awayTeamId: number },
  interactive: boolean
): Promise<void> {
  try {
    await simulatePenaltyShootout({
      saveGameMatchId: match.id,
      interactive,
    });
    await prisma.saveGameMatch.update({
      where: { id: match.id },
      data: { isPlayed: true },
    });
  } catch (err) {
    console.error(
      `[Matchday] shootout failed for match ${match.id} (interactive=${interactive}) — emergency deciding:`,
      err
    );
    await emergencyDecideWinner(match.id);
  }
}

/* -------------------------------------------------------------------------- */
/* Public: start or resume a matchday                                         */
/* -------------------------------------------------------------------------- */

// Back-compat shim: old callers import ensureInitialMatchState from matchService
export { ensureMatchState as ensureInitialMatchState } from "./matchStateService";

export async function startOrResumeMatchday(saveGameId: number): Promise<void> {
  stoppedSaves.delete(saveGameId);

  const { md, coachTeamId } = await getActiveMatchday(saveGameId);
  const matchIds = md.saveGameMatches.map((m) => m.id);

  await Promise.all(matchIds.map((id) => ensureMatchState(id)));

  for (const m of md.saveGameMatches) {
    broadcastMatchTick(saveGameId, {
      matchId: m.id,
      minute: 0,
      homeGoals: m.homeGoals ?? 0,
      awayGoals: m.awayGoals ?? 0,
      id: m.id, // legacy
      phase: "NORMAL",
    });
  }

  await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: GameStage.MATCHDAY },
  });
  broadcastStageChanged({ gameStage: "MATCHDAY", matchdayNumber: md.number }, saveGameId);

  // -------------------------- minute loop: 1..90 ----------------------------
  for (let minute = 1; minute <= 90; minute++) {
    if (stoppedSaves.has(saveGameId)) {
      return;
    }

    await checkAndHonorExternalPause(saveGameId, md.number);
    while (pausedSaves.has(saveGameId)) {
      if (stoppedSaves.has(saveGameId)) return;
      await sleep(200);
    }

    if (minute === 46) {
      await pauseUntilResumed(saveGameId, md.number);
    }

    for (const matchId of matchIds) {
      const match = (await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          homeGoals: true,
          awayGoals: true,
          homeTeamId: true,
          awayTeamId: true,
        },
      })) as (SaveGameMatch & { homeTeamId: number; awayTeamId: number }) | null;

      if (!match) continue;

      const state = await getOrCreateMatchState(matchId);

      const simEventsRaw = await simulateMatch(match, state, minute);

      const sentOffIds = new Set<number>(
        simEventsRaw
          .filter((e) => e.type === MatchEventType.RED && typeof e.saveGamePlayerId === "number")
          .map((e) => e.saveGamePlayerId!)
      );

      const simEvents = simEventsRaw.filter(
        (e) => !(e.type === MatchEventType.GOAL && sentOffIds.has(e.saveGamePlayerId!))
      );

      for (const e of simEvents) {
        if (e.type === MatchEventType.GOAL) {
          const isHome = (await resolveIsHomeTeam(e, match)) ?? true;
          await updateScoreForGoal(match.id, isHome);
        }
      }

      // 1) RED → remove immediately from lineup & bench
      for (const e of simEvents) {
        if (e.type === MatchEventType.RED && typeof e.saveGamePlayerId === "number") {
          const isHome = (await resolveIsHomeTeam(e, match)) ?? true;
          await removePlayerFromSquad(match.id, e.saveGamePlayerId!, isHome);

          const p = await prisma.saveGamePlayer.findUnique({
            where: { id: e.saveGamePlayerId! },
            select: { name: true, position: true, rating: true },
          });
          const isGK =
            (p?.position ?? "").toUpperCase() === "GK" ||
            (p?.position ?? "").toUpperCase() === "GOALKEEPER";

          if (isGK) {
            const pausePayload = {
              matchId: match.id,
              isHomeTeam: isHome,
              reason: "GK_RED_NEEDS_GK" as PauseReason,
              player: p
                ? { id: e.saveGamePlayerId!, name: p.name, position: p.position ?? "GK", rating: p.rating ?? undefined }
                : undefined,
            };
            broadcastPauseRequest(pausePayload, saveGameId);

            if (
              coachTeamId &&
              ((isHome && match.homeTeamId === coachTeamId) ||
                (!isHome && match.awayTeamId === coachTeamId))
            ) {
              await pauseUntilResumed(saveGameId, md.number);
            }
          }
        }
      }

      // 2) INJURY → coach decision (do not auto-remove here)
      for (const e of simEvents) {
        if (e.type === MatchEventType.INJURY) {
          const isHome = (await resolveIsHomeTeam(e, match)) ?? true;
          const p = await prisma.saveGamePlayer.findUnique({
            where: { id: e.saveGamePlayerId! },
            select: { name: true, position: true, rating: true },
          });

          const pausePayload = {
            matchId: match.id,
            isHomeTeam: isHome,
            reason: "INJURY" as PauseReason,
            player: p
              ? { id: e.saveGamePlayerId!, name: p.name, position: p.position ?? "MF", rating: p.rating ?? undefined }
              : undefined,
          };
          broadcastPauseRequest(pausePayload, saveGameId);

          if (
            coachTeamId &&
            ((isHome && match.homeTeamId === coachTeamId) ||
              (!isHome && match.awayTeamId === coachTeamId))
          ) {
            await pauseUntilResumed(saveGameId, md.number);
          }
        }
      }

      await persistAndBroadcastEvents(saveGameId, match, simEvents);

      const latest = await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
        select: { homeGoals: true, awayGoals: true },
      });

      broadcastMatchTick(saveGameId, {
        matchId,
        minute,
        homeGoals: latest?.homeGoals ?? 0,
        awayGoals: latest?.awayGoals ?? 0,
        id: matchId, // legacy
        phase: "NORMAL",
      });
    }

    await sleep(TICK_MS);
  }

  // ----------------------- full time reached (90') --------------------------
  if (md.type !== MatchdayType.CUP) {
    await prisma.saveGameMatch.updateMany({
      where: { id: { in: matchIds } },
      data: { isPlayed: true },
    });

    await prisma.gameState.updateMany({
      where: { currentSaveGameId: saveGameId },
      data: { gameStage: GameStage.RESULTS },
    });
    broadcastStageChanged({ gameStage: "RESULTS", matchdayNumber: md.number }, saveGameId);
    return;
  }

  // CUP ET & pens path unchanged (calls updated helper internally)
  const etCandidates: { id: number; homeTeamId: number; awayTeamId: number }[] = [];
  for (const matchId of matchIds) {
    const m = await prisma.saveGameMatch.findUnique({
      where: { id: matchId },
      select: { id: true, homeTeamId: true, awayTeamId: true, homeGoals: true, awayGoals: true },
    });
    if (!m) continue;
    const gH = m.homeGoals ?? 0;
    const gA = m.awayGoals ?? 0;
    if (gH === gA) {
      etCandidates.push({ id: m.id, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId });
    } else {
      await prisma.saveGameMatch.update({ where: { id: matchId }, data: { isPlayed: true } });
    }
  }

  if (etCandidates.length > 0) {
    await Promise.all(
      etCandidates.map((m) =>
        simulateExtraTimeForMatch(saveGameId, m.id, {
          id: m.id,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
        })
      )
    );
  }

  const shootoutTasks: Promise<void>[] = [];
  for (const m of etCandidates) {
    const after = await prisma.saveGameMatch.findUnique({
      where: { id: m.id },
      select: { homeGoals: true, awayGoals: true },
    });
    const h = after?.homeGoals ?? 0;
    const a = after?.awayGoals ?? 0;

    if (h !== a) {
      await prisma.saveGameMatch.update({ where: { id: m.id }, data: { isPlayed: true } });
      continue;
    }

    const interactive =
      !!coachTeamId && (m.homeTeamId === coachTeamId || m.awayTeamId === coachTeamId);

    shootoutTasks.push(safeResolveShootout(saveGameId, m, interactive));
  }

  if (shootoutTasks.length) {
    await Promise.allSettled(shootoutTasks);
  }

  await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: GameStage.RESULTS },
  });
  broadcastStageChanged({ gameStage: "RESULTS", matchdayNumber: md.number }, saveGameId);
}
