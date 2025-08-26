// backend/src/services/matchService.ts
import prisma from "../utils/prisma";
import {
  GameStage,
  MatchEventType,
  SaveGameMatch,
  MatchState,
} from "@prisma/client";
import { simulateMatch, type SimulatedMatchEvent } from "../engine/simulateMatch";
import {
  broadcastMatchEvent,
  broadcastMatchTick,
  broadcastStageChanged,
} from "../sockets/broadcast";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

// ~1.5 real-time minutes for 90' → ~1s per simulated minute
const TICK_MS = 1000;

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
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Ensure a MatchState row exists for this SaveGameMatch ID. */
export async function ensureInitialMatchState(saveGameMatchId: number) {
  const existing = await prisma.matchState.findUnique({
    where: { saveGameMatchId },
  });
  if (existing) return existing;

  return prisma.matchState.create({
    data: {
      saveGameMatchId,
      homeFormation: "4-4-2",
      awayFormation: "4-4-2",
      homeLineup: [],
      awayLineup: [],
      homeReserves: [],
      awayReserves: [],
      homeSubsMade: 0,
      awaySubsMade: 0,
      isPaused: false,
      subsRemainingHome: 3,
      subsRemainingAway: 3,
    },
  });
}

async function getActiveMatchday(saveGameId: number) {
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { currentMatchday: true, gameStage: true },
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
  return md;
}

async function getMatchState(mId: number) {
  let st = await prisma.matchState.findUnique({ where: { saveGameMatchId: mId } });
  if (!st) st = await ensureInitialMatchState(mId);
  return st as MatchState;
}

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

async function persistAndBroadcastEvents(
  saveGameId: number,
  match: SaveGameMatch,
  simulated: SimulatedMatchEvent[]
) {
  if (!simulated.length) return;

  // Persist events in one transaction
  await prisma.$transaction(
    simulated.map((e) =>
      prisma.matchEvent.create({
        data: {
          saveGameMatchId: match.id,
          minute: e.minute,
          type: e.type,
          description: e.description,
          saveGamePlayerId: e.saveGamePlayerId,
        },
      })
    )
  );

  // Broadcast each event; enrich with player name for the FE (best-effort)
  for (const e of simulated) {
    let player: { id: number; name: string } | null = null;
    try {
      const p = await prisma.saveGamePlayer.findUnique({
        where: { id: e.saveGamePlayerId },
        select: { id: true, name: true },
      });
      if (p) player = { id: p.id, name: p.name };
    } catch {
      /* ignore */
    }

    broadcastMatchEvent(saveGameId, {
      matchId: match.id,
      minute: e.minute,
      type: e.type,
      description: e.description,
      player,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Public: start or resume a matchday                                         */
/* -------------------------------------------------------------------------- */

export async function startOrResumeMatchday(saveGameId: number): Promise<void> {
  stoppedSaves.delete(saveGameId);

  const md = await getActiveMatchday(saveGameId);
  const matchIds = md.saveGameMatches.map((m) => m.id);

  // Ensure MatchState exists for each match
  await Promise.all(matchIds.map((id) => ensureInitialMatchState(id)));

  // Pre-kickoff tick (minute 0) to prime the UI, with current scores
  for (const m of md.saveGameMatches) {
    broadcastMatchTick(saveGameId, {
      matchId: m.id,
      minute: 0,
      homeGoals: m.homeGoals ?? 0,
      awayGoals: m.awayGoals ?? 0,
      id: m.id, // legacy
    });
  }

  // Make sure stage is MATCHDAY before starting ticks (belt + suspenders)
  await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: GameStage.MATCHDAY },
  });
  broadcastStageChanged(
    { gameStage: "MATCHDAY", matchdayNumber: md.number },
    saveGameId
  );

  // -------------------------- minute loop: 1..90 ----------------------------
  for (let minute = 1; minute <= 90; minute++) {
    if (stoppedSaves.has(saveGameId)) {
      // Hard stop → leave stage as-is; caller may flip it.
      return;
    }

    // Halftime handling at minute 46 (i.e., after minute 45 has been processed)
    if (minute === 46) {
      pausedSaves.add(saveGameId);

      await prisma.gameState.updateMany({
        where: { currentSaveGameId: saveGameId },
        data: { gameStage: GameStage.HALFTIME },
      });
      broadcastStageChanged(
        { gameStage: "HALFTIME", matchdayNumber: md.number },
        saveGameId
      );

      // Wait until resumed to MATCHDAY (poll every 400ms, up to ~2 minutes)
      const started = Date.now();
      while (true) {
        if (stoppedSaves.has(saveGameId)) return;
        const gs = await prisma.gameState.findFirst({
          where: { currentSaveGameId: saveGameId },
          select: { gameStage: true },
        });
        if (gs?.gameStage === GameStage.MATCHDAY) break;
        if (Date.now() - started > 120_000) break; // safety escape
        await sleep(400);
      }

      // Announce MATCHDAY again after halftime
      broadcastStageChanged(
        { gameStage: "MATCHDAY", matchdayNumber: md.number },
        saveGameId
      );
      pausedSaves.delete(saveGameId);
    }

    // Process each match this minute
    for (const matchId of matchIds) {
      const match = (await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
      })) as SaveGameMatch | null;
      if (!match) continue;

      const state = await getMatchState(matchId);

      // Simulate events for this minute
      const simEvents = await simulateMatch(match, state, minute);

      // If any GOAL, update score first (so tick reflects new score)
      for (const e of simEvents) {
        if (e.type === MatchEventType.GOAL) {
          await updateScoreForGoal(match.id, e.isHomeTeam);
        }
      }

      // Persist + broadcast all events
      await persistAndBroadcastEvents(saveGameId, match, simEvents);

      // Broadcast a tick with the latest score
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
      });
    }

    // Pacing between minutes
    await sleep(TICK_MS);
  }

  // Full time → mark matches as played
  await prisma.saveGameMatch.updateMany({
    where: { id: { in: matchIds } },
    data: { isPlayed: true },
  });

  // Flip to RESULTS and notify
  await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: GameStage.RESULTS },
  });
  broadcastStageChanged(
    { gameStage: "RESULTS", matchdayNumber: md.number },
    saveGameId
  );
}
