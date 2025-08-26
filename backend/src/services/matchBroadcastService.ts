// backend/src/services/matchBroadcastService.ts

import type { Server } from "socket.io";
import prisma from "../utils/prisma";
import { GameStage, MatchEventType, MatchState } from "@prisma/client";
import {
  broadcastMatchTick,
  broadcastEvent,
  broadcastStageChanged,
  broadcastPauseRequest,
} from "../sockets/broadcast";
import { simulateMatch } from "../engine/simulateMatch";
import {
  ensureAppearance,
  recordGoal,
  recordRedCard,
  recordInjury,
} from "./saveStatsService";
import { finalizeMatchday } from "../services/resultsService";

/* ────────────────────────────────────────────────
 * single-run guard per save
 * ──────────────────────────────────────────────── */
const RUNNING_KEY = Symbol.for("matchdayRunningFlags");
const globalAny = global as any;
if (!globalAny[RUNNING_KEY]) globalAny[RUNNING_KEY] = new Map<number, boolean>();
const runningFlags: Map<number, boolean> = globalAny[RUNNING_KEY];

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/* ────────────────────────────────────────────────
 * Stage helpers
 * ──────────────────────────────────────────────── */
async function fetchGameStage(saveGameId: number): Promise<GameStage> {
  const scoped = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { gameStage: true },
  });
  if (scoped?.gameStage) return scoped.gameStage;

  const single = await prisma.gameState.findUnique({
    where: { id: 1 },
    select: { gameStage: true },
  });
  if (!single?.gameStage) {
    throw new Error("GameState not found to determine current gameStage");
  }
  return single.gameStage;
}

async function waitUntilMatchday(saveGameId: number) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const stage = await fetchGameStage(saveGameId);
    if (stage === GameStage.MATCHDAY) return;
    await delay(500);
  }
}

async function ensureStageIsMatchday(saveGameId: number) {
  const stage = await fetchGameStage(saveGameId);
  if (stage !== GameStage.MATCHDAY) {
    console.log(`⏸️ Paused (stage=${stage}) for save ${saveGameId}… waiting to resume MATCHDAY`);
    await waitUntilMatchday(saveGameId);
    console.log(`▶️ Resumed MATCHDAY for save ${saveGameId}`);
  }
}

/** Scoped stage setter with singleton fallback + broadcast */
async function setStageScoped(saveGameId: number, stage: GameStage) {
  const updated = await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: stage },
  });
  if (updated.count === 0) {
    // Fallback for singleton schema
    await prisma.gameState.update({
      where: { id: 1 },
      data: { currentSaveGameId: saveGameId, gameStage: stage },
    });
  }
  try {
    broadcastStageChanged({ gameStage: stage }, saveGameId, { alsoGlobal: true });
  } catch {
    /* ignore socket errors */
  }
}

/* ────────────────────────────────────────────────
 * Lineup helpers & kickoff normalization
 * ──────────────────────────────────────────────── */
type LocalState = {
  homeLineup: number[];
  awayLineup: number[];
  homeReserves: number[];
  awayReserves: number[];
  subsRemainingHome: number;
  subsRemainingAway: number;
};

type PlayerInfo = { id: number; name: string; position: string | null };

function isGKPosition(pos?: string | null) {
  return (pos ?? "").toUpperCase() === "GK";
}

function removeId(arr: number[], id: number) {
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1);
}

async function buildFallbackState(
  homeTeamId: number,
  awayTeamId: number
): Promise<LocalState> {
  const [homeAll, awayAll] = await Promise.all([
    prisma.saveGamePlayer.findMany({
      where: { teamId: homeTeamId },
      orderBy: { rating: "desc" },
      select: { id: true },
    }),
    prisma.saveGamePlayer.findMany({
      where: { teamId: awayTeamId },
      orderBy: { rating: "desc" },
      select: { id: true },
    }),
  ]);
  const homeLineup = homeAll.slice(0, 11).map((p) => p.id);
  const awayLineup = awayAll.slice(0, 11).map((p) => p.id);
  const homeReserves = homeAll.slice(11).map((p) => p.id);
  const awayReserves = awayAll.slice(11).map((p) => p.id);

  return {
    homeLineup,
    awayLineup,
    homeReserves,
    awayReserves,
    subsRemainingHome: 3,
    subsRemainingAway: 3,
  };
}

/** Load a player cache (name+position) for fast lookups */
async function preloadPlayerMap(ids: number[]): Promise<Map<number, PlayerInfo>> {
  if (ids.length === 0) return new Map();
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: Array.from(new Set(ids)) } },
    select: { id: true, name: true, position: true },
  });
  return new Map(players.map((p) => [p.id, p]));
}

/** Ensure an entry exists in the info cache */
async function ensureInfoCached(
  _matchId: number,
  cache: Map<number, PlayerInfo>,
  playerId: number
) {
  if (cache.has(playerId)) return;
  const p = await prisma.saveGamePlayer.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, position: true },
  });
  if (p) cache.set(p.id, p);
}

/** At kickoff: ensure exactly ONE GK in each XI if possible */
function normalizeGKAtKickoff(state: LocalState, info: Map<number, PlayerInfo>) {
  const teams: Array<{ lineup: number[]; reserves: number[] }> = [
    { lineup: state.homeLineup, reserves: state.homeReserves },
    { lineup: state.awayLineup, reserves: state.awayReserves },
  ];

  for (const { lineup, reserves } of teams) {
    const gksInXI = lineup.filter((id) => isGKPosition(info.get(id)?.position));
    // Case 1: zero GK in lineup → try to bring one from bench, swapping out a non-GK
    if (gksInXI.length === 0) {
      const benchGK = reserves.find((id) => isGKPosition(info.get(id)?.position));
      if (benchGK != null) {
        const swapOut = [...lineup].reverse().find((id) => !isGKPosition(info.get(id)?.position));
        if (swapOut != null) {
          removeId(lineup, swapOut);
          lineup.push(benchGK);
          removeId(reserves, benchGK);
          reserves.push(swapOut);
        }
      }
    }
    // Case 2: >1 GK in XI → keep the first, move extras to bench and pull non-GKs in if possible
    if (gksInXI.length > 1) {
      const keep = gksInXI[0];
      for (const extra of gksInXI.slice(1)) {
        removeId(lineup, extra);
        reserves.push(extra);
        const benchOutfield = reserves.find((id) => !isGKPosition(info.get(id)?.position));
        if (benchOutfield != null) {
          removeId(reserves, benchOutfield);
          lineup.push(benchOutfield);
        }
      }
    }
  }
}

/** Persist or create MatchState for this match */
async function upsertMatchState(matchId: number, s: LocalState) {
  await prisma.matchState.upsert({
    where: { saveGameMatchId: matchId },
    create: {
      saveGameMatch: { connect: { id: matchId } },
      homeFormation: "4-4-2",
      awayFormation: "4-4-2",
      homeLineup: s.homeLineup,
      awayLineup: s.awayLineup,
      homeReserves: s.homeReserves,
      awayReserves: s.awayReserves,
      homeSubsMade: 0,
      awaySubsMade: 0,
      subsRemainingHome: s.subsRemainingHome,
      subsRemainingAway: s.subsRemainingAway,
      isPaused: false,
    },
    update: {
      homeLineup: s.homeLineup,
      awayLineup: s.awayLineup,
      homeReserves: s.homeReserves,
      awayReserves: s.awayReserves,
      subsRemainingHome: s.subsRemainingHome,
      subsRemainingAway: s.subsRemainingAway,
    },
  });
}

async function persistState(matchId: number, data: Partial<MatchState>) {
  await prisma.matchState.update({
    where: { saveGameMatchId: matchId },
    data,
  });
}

/* Helpers to pick subs */
async function pickBenchGK(reserveIds: number[], info: Map<number, PlayerInfo>): Promise<number | null> {
  if (reserveIds.length === 0) return null;
  const gkIds = reserveIds.filter((id) => isGKPosition(info.get(id)?.position));
  if (gkIds.length === 0) return null;
  const unlocked = await prisma.saveGamePlayer.findMany({
    where: { id: { in: gkIds }, lockedUntilNextMatchday: false },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return unlocked[0]?.id ?? null;
}

async function pickAnyReserve(reserveIds: number[]): Promise<number | null> {
  if (reserveIds.length === 0) return null;
  const unlocked = await prisma.saveGamePlayer.findMany({
    where: { id: { in: reserveIds }, lockedUntilNextMatchday: false },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return unlocked[0]?.id ?? null;
}

/* When we insert a bench GK after a GK red card, we must also remove an outfielder to stay at 10 */
function popOneOutfieldFromXI(lineup: number[], info: Map<number, PlayerInfo>): number | null {
  for (let i = lineup.length - 1; i >= 0; i--) {
    const id = lineup[i];
    if (!isGKPosition(info.get(id)?.position)) {
      lineup.splice(i, 1);
      return id;
    }
  }
  return null;
}

/* ────────────────────────────────────────────────
 * Track pending removals for coached injuries
 * ──────────────────────────────────────────────── */
type PendingBySide = { home: Set<number>; away: Set<number> };
const pendingCoachInjuryRemovals = new Map<number, PendingBySide>(); // matchId -> {home, away}

function addPendingRemoval(matchId: number, isHome: boolean, playerId: number) {
  let entry = pendingCoachInjuryRemovals.get(matchId);
  if (!entry) {
    entry = { home: new Set<number>(), away: new Set<number>() };
    pendingCoachInjuryRemovals.set(matchId, entry);
  }
  (isHome ? entry.home : entry.away).add(playerId);
}

function clearPendingForMatch(matchId: number) {
  pendingCoachInjuryRemovals.delete(matchId);
}

/** On resume: if injured player still on the field (no sub made), remove them now */
async function applyPendingRemovalsOnResume(
  matchId: number,
  state: LocalState
) {
  const entry = pendingCoachInjuryRemovals.get(matchId);
  if (!entry) return;

  // HOME side
  if (entry.home.size > 0) {
    for (const pid of Array.from(entry.home)) {
      if (state.homeLineup.includes(pid)) {
        removeId(state.homeLineup, pid);
      }
    }
    await persistState(matchId, { homeLineup: state.homeLineup });
  }

  // AWAY side
  if (entry.away.size > 0) {
    for (const pid of Array.from(entry.away)) {
      if (state.awayLineup.includes(pid)) {
        removeId(state.awayLineup, pid);
      }
    }
    await persistState(matchId, { awayLineup: state.awayLineup });
  }

  clearPendingForMatch(matchId);
}

/* ────────────────────────────────────────────────
 * Broadcaster
 * ──────────────────────────────────────────────── */
export async function broadcastMatchday(_io: Server, saveGameId: number): Promise<void> {
  if (runningFlags.get(saveGameId)) {
    console.log(`ℹ️ Broadcast already running for save ${saveGameId}, skipping duplicate start.`);
    return;
  }

  // Resolve current round (+coach)
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { id: true, currentMatchday: true, coachTeamId: true },
  });
  if (!gs) throw new Error(`GameState not found for saveGameId=${saveGameId}`);
  const coachedTeamId = gs.coachTeamId ?? null;

  const matchday = await prisma.matchday.findFirst({
    where: { saveGameId, number: gs.currentMatchday },
    include: { saveGameMatches: true },
  });
  if (!matchday) throw new Error(`Matchday #${gs.currentMatchday} not found for saveGameId=${saveGameId}`);

  const room = `save-${saveGameId}`;
  console.log(`📡 Starting broadcast for save ${saveGameId}, matchday ${gs.currentMatchday}, room ${room}`);
  console.log(`🧮 Matches this round: ${matchday.saveGameMatches.length}`);
  runningFlags.set(saveGameId, true);

  // Per-match state
  const scores = new Map<number, { home: number; away: number }>();
  const localState = new Map<number, LocalState>();
  const playerInfoCache = new Map<number, Map<number, PlayerInfo>>(); // per match -> player map

  // Initialize states, normalize GK, persist state, and ensure appearances
  for (const m of matchday.saveGameMatches) {
    // null-safe score seed
    scores.set(m.id, { home: m.homeGoals ?? 0, away: m.awayGoals ?? 0 });

    const dbState = await prisma.matchState.findUnique({
      where: { saveGameMatchId: m.id },
      select: {
        homeLineup: true,
        awayLineup: true,
        homeReserves: true,
        awayReserves: true,
        subsRemainingHome: true,
        subsRemainingAway: true,
      },
    });

    let state: LocalState;
    if (dbState) {
      state = {
        homeLineup: dbState.homeLineup ?? [],
        awayLineup: dbState.awayLineup ?? [],
        homeReserves: dbState.homeReserves ?? [],
        awayReserves: dbState.awayReserves ?? [],
        subsRemainingHome: dbState.subsRemainingHome ?? 3,
        subsRemainingAway: dbState.subsRemainingAway ?? 3,
      };
    } else {
      state = await buildFallbackState(m.homeTeamId, m.awayTeamId);
    }

    // Build player info cache for lineup + bench
    const info = await preloadPlayerMap([
      ...state.homeLineup,
      ...state.awayLineup,
      ...state.homeReserves,
      ...state.awayReserves,
    ]);

    // Kickoff: ensure exactly one GK on each side (if possible)
    normalizeGKAtKickoff(state, info);

    // Persist kickoff state
    await upsertMatchState(m.id, state);

    // Appearance rows for XI
    await Promise.all([
      ...state.homeLineup.map((pid) => ensureAppearance(pid, m.id)),
      ...state.awayLineup.map((pid) => ensureAppearance(pid, m.id)),
    ]);

    localState.set(m.id, state);
    playerInfoCache.set(m.id, info);
  }

  try {
    // Stage → MATCHDAY (scoped)
    await setStageScoped(saveGameId, GameStage.MATCHDAY);

    // Minute loop
    for (let minute = 0; minute <= 90; minute++) {
      await ensureStageIsMatchday(saveGameId);
      if (minute % 10 === 0) console.log(`⏱️ save ${saveGameId} minute ${minute}`);

      for (const m of matchday.saveGameMatches) {
        const state = localState.get(m.id)!;
        const info = playerInfoCache.get(m.id)!;

        // Simulate (emits player-named events; GOAL increments DB score)
        const simEvents = await simulateMatch(m, (state as unknown) as MatchState, minute);

        // Update in-memory score for this tick (GOAL events already incremented in DB)
        let addHome = 0;
        let addAway = 0;
        for (const e of simEvents) {
          if (e.type === MatchEventType.GOAL) {
            const isHomeGoal = state.homeLineup.includes(e.saveGamePlayerId);
            if (isHomeGoal) addHome++;
            else addAway++;
          }
        }
        if (addHome || addAway) {
          const s = scores.get(m.id)!;
          s.home += addHome;
          s.away += addAway;
          scores.set(m.id, s);
        }

        // Apply discipline/injuries to lineups & record stats
        let mustPause = false;
        let pauseReason: "INJURY" | "GK_INJURY" | "GK_RED_NEEDS_GK" | null = null;
        let pauseIsHome = false;
        let pausePlayer: PlayerInfo | null = null;

        for (const e of simEvents) {
          const pid = e.saveGamePlayerId;
          const p = info.get(pid) ?? null;
          const isGK = isGKPosition(p?.position);
          const isHome = state.homeLineup.includes(pid);
          const teamId = isHome ? m.homeTeamId : m.awayTeamId;
          const isCoachedTeam = coachedTeamId != null && coachedTeamId === teamId;

          // Record stats per event
          if (e.type === MatchEventType.GOAL) await recordGoal(pid, m.id);
          if (e.type === MatchEventType.RED) await recordRedCard(pid, m.id);
          if (e.type === MatchEventType.INJURY) await recordInjury(pid, m.id);

          // Remove from XI for RED ONLY (injuries handled below)
          if (e.type === MatchEventType.RED) {
            if (isHome) {
              removeId(state.homeLineup, pid);
              await persistState(m.id, { homeLineup: state.homeLineup });
            } else {
              removeId(state.awayLineup, pid);
              await persistState(m.id, { awayLineup: state.awayLineup });
            }
          }

          // Injury specific side-effects: lock player for next matchday
          if (e.type === MatchEventType.INJURY) {
            await prisma.saveGamePlayer.update({
              where: { id: pid },
              data: { lockedUntilNextMatchday: true },
            });
          }

          // Handle forced subs / pauses
          if (e.type === MatchEventType.RED) {
            if (isGK) {
              // GK red: if bench GK exists,
              const reserves = isHome ? state.homeReserves : state.awayReserves;
              const benchGK = await pickBenchGK(reserves, info);

              if (isCoachedTeam) {
                // Coach team: pause ONLY if a bench GK exists
                if (benchGK != null) {
                  mustPause = true;
                  pauseReason = "GK_RED_NEEDS_GK";
                  pauseIsHome = isHome;
                  pausePlayer = p;
                }
                // else continue with no GK (no pause)
              } else {
                // Non-coach: auto-handle
                if (benchGK != null) {
                  const hasSub =
                    (isHome ? state.subsRemainingHome : state.subsRemainingAway) > 0;
                  if (hasSub) {
                    // bring GK in, remove an outfielder to keep 10
                    if (isHome) {
                      const removed = popOneOutfieldFromXI(state.homeLineup, info);
                      if (removed != null) state.homeReserves.push(removed);
                      removeId(state.homeReserves, benchGK);
                      state.homeLineup.push(benchGK);
                      state.subsRemainingHome = Math.max(0, state.subsRemainingHome - 1);
                      await ensureAppearance(benchGK, m.id);
                      await persistState(m.id, {
                        homeLineup: state.homeLineup,
                        homeReserves: state.homeReserves,
                        subsRemainingHome: state.subsRemainingHome,
                      });
                    } else {
                      const removed = popOneOutfieldFromXI(state.awayLineup, info);
                      if (removed != null) state.awayReserves.push(removed);
                      removeId(state.awayReserves, benchGK);
                      state.awayLineup.push(benchGK);
                      state.subsRemainingAway = Math.max(0, state.subsRemainingAway - 1);
                      await ensureAppearance(benchGK, m.id);
                      await persistState(m.id, {
                        awayLineup: state.awayLineup,
                        awayReserves: state.awayReserves,
                        subsRemainingAway: state.subsRemainingAway,
                      });
                    }
                    await ensureInfoCached(m.id, info, benchGK);
                  }
                }
                // else: no bench GK, continue with no GK
              }
            }
            // Outfield RED: already removed above; continue
          } else if (e.type === MatchEventType.INJURY) {
            // Any injury:
            if (isCoachedTeam) {
              // Coach team: pause (GK or outfield), do NOT remove now.
              mustPause = true;
              pauseReason = isGK ? "GK_INJURY" : "INJURY";
              pauseIsHome = isHome;
              pausePlayer = p;
              // Remember to remove on resume if still on-field.
              if (p) addPendingRemoval(m.id, isHome, p.id);
            } else {
              // Non-coach: auto forced substitution when possible; if not, remove injured now
              if (isGK) {
                const reserves = isHome ? state.homeReserves : state.awayReserves;
                const subGK = await pickBenchGK(reserves, info);
                let subId = subGK ?? (await pickAnyReserve(reserves));
                const hasSub =
                  (isHome ? state.subsRemainingHome : state.subsRemainingAway) > 0;

                if (subId != null && hasSub) {
                  if (isHome) {
                    // swap: injured out, sub in
                    removeId(state.homeLineup, pid);
                    removeId(state.homeReserves, subId);
                    state.homeLineup.push(subId);
                    state.subsRemainingHome = Math.max(0, state.subsRemainingHome - 1);
                    await ensureAppearance(subId, m.id);
                    await persistState(m.id, {
                      homeLineup: state.homeLineup,
                      homeReserves: state.homeReserves,
                      subsRemainingHome: state.subsRemainingHome,
                    });
                  } else {
                    removeId(state.awayLineup, pid);
                    removeId(state.awayReserves, subId);
                    state.awayLineup.push(subId);
                    state.subsRemainingAway = Math.max(0, state.subsRemainingAway - 1);
                    await ensureAppearance(subId, m.id);
                    await persistState(m.id, {
                      awayLineup: state.awayLineup,
                      awayReserves: state.awayReserves,
                      subsRemainingAway: state.subsRemainingAway,
                    });
                  }
                  await ensureInfoCached(m.id, info, subId);
                } else {
                  // no reserve or no sub left → remove injured and continue short-handed
                  if (isHome) {
                    removeId(state.homeLineup, pid);
                    await persistState(m.id, { homeLineup: state.homeLineup });
                  } else {
                    removeId(state.awayLineup, pid);
                    await persistState(m.id, { awayLineup: state.awayLineup });
                  }
                }
              } else {
                // Outfield injury for AI: try forced sub else remove
                const reserves = isHome ? state.homeReserves : state.awayReserves;
                const subId = await pickAnyReserve(reserves);
                const hasSub =
                  (isHome ? state.subsRemainingHome : state.subsRemainingAway) > 0;

                if (subId != null && hasSub) {
                  if (isHome) {
                    removeId(state.homeLineup, pid);
                    removeId(state.homeReserves, subId);
                    state.homeLineup.push(subId);
                    state.subsRemainingHome = Math.max(0, state.subsRemainingHome - 1);
                    await ensureAppearance(subId, m.id);
                    await persistState(m.id, {
                      homeLineup: state.homeLineup,
                      homeReserves: state.homeReserves,
                      subsRemainingHome: state.subsRemainingHome,
                    });
                  } else {
                    removeId(state.awayLineup, pid);
                    removeId(state.awayReserves, subId);
                    state.awayLineup.push(subId);
                    state.subsRemainingAway = Math.max(0, state.subsRemainingAway - 1);
                    await ensureAppearance(subId, m.id);
                    await persistState(m.id, {
                      awayLineup: state.awayLineup,
                      awayReserves: state.awayReserves,
                      subsRemainingAway: state.subsRemainingAway,
                    });
                  }
                  await ensureInfoCached(m.id, info, subId);
                } else {
                  if (isHome) {
                    removeId(state.homeLineup, pid);
                    await persistState(m.id, { homeLineup: state.homeLineup });
                  } else {
                    removeId(state.awayLineup, pid);
                    await persistState(m.id, { awayLineup: state.awayLineup });
                  }
                }
              }
            }
          }
        } // end for each simEvent

        // Persist DB events & emit socket "match-event" (with player info)
        if (simEvents.length > 0) {
          await prisma.matchEvent.createMany({
            data: simEvents.map((e) => ({
              minute,
              type: e.type,
              description: e.description,
              saveGameMatchId: m.id,
              matchdayId: matchday.id,
              saveGamePlayerId: e.saveGamePlayerId,
            })),
          });

          for (const e of simEvents) {
            const p = playerInfoCache.get(m.id)?.get(e.saveGamePlayerId);
            broadcastEvent(
              m.id,
              minute,
              e.type,
              e.description,
              p ? { id: e.saveGamePlayerId, name: p.name } : null,
              saveGameId,
              { alsoGlobal: true }
            );
          }
        }

        // If we must pause (coach team only), flip to HALFTIME and ask the UI
        if (mustPause && pauseReason) {
          await setStageScoped(saveGameId, GameStage.HALFTIME);

          // send a pause-request with reason & which side
          if (pausePlayer) {
            broadcastPauseRequest(
              {
                matchId: m.id,
                minute,
                isHomeTeam: pauseIsHome,
                reason: pauseReason,
                player: { id: pausePlayer.id, name: pausePlayer.name, position: pausePlayer.position },
              },
              saveGameId,
              { alsoGlobal: true }
            );
          } else {
            broadcastPauseRequest(
              { matchId: m.id, minute, isHomeTeam: pauseIsHome, reason: pauseReason },
              saveGameId,
              { alsoGlobal: true }
            );
          }

          console.log(`⏸️ Pause requested (${pauseReason}) on match ${m.id}, waiting for resume…`);
          await waitUntilMatchday(saveGameId); // coach clicks "Resume match" (MATCHDAY)

          // If coach resumed without a sub, remove pending injured now
          await applyPendingRemovalsOnResume(m.id, state);

          await setStageScoped(saveGameId, GameStage.MATCHDAY);
          console.log(`▶️ Resumed after pause on match ${m.id}.`);
        }

        // Emit minute tick
        const s = scores.get(m.id)!;
        broadcastMatchTick(m.id, minute, s.home, s.away, saveGameId, { alsoGlobal: true });
      }

      // Halftime hard stop at 45'
      if (minute === 45) {
        await setStageScoped(saveGameId, GameStage.HALFTIME);
        console.log(`⏸️ Halftime reached for save ${saveGameId}. Waiting for resume…`);
        await waitUntilMatchday(saveGameId);

        // On general halftime resume, apply any pending removals for all matches
        for (const m of matchday.saveGameMatches) {
          const state = localState.get(m.id);
          if (state) await applyPendingRemovalsOnResume(m.id, state);
        }

        await setStageScoped(saveGameId, GameStage.MATCHDAY);
        console.log(`▶️ Second half resumed for save ${saveGameId}.`);
      }

      await delay(1000);
    }

    // Full time → RESULTS
    await setStageScoped(saveGameId, GameStage.RESULTS);

    // 🔒 Lock matchday & produce standings/preview (immutable record)
    await finalizeMatchday(saveGameId, matchday.id);

    console.log(`🏁 Broadcast finished for save ${saveGameId}.`);
  } finally {
    runningFlags.delete(saveGameId);
  }
}
