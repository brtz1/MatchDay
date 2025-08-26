// backend/src/services/matchdayService.ts

import prisma from '../utils/prisma';
import { ensureMatchState } from './matchStateService';
import { updateLeagueTableForMatchday, prepareLeagueTableForNewSeason } from './leagueTableService';
import { updateMoraleAndContracts } from './moraleContractService';
import { getGameState } from './gameState';
import { generateFullSeason } from './fixtureServices';
import { startOrResumeMatchday } from './matchdayEngine';
import {
  broadcastStageChanged,
  broadcastMatchTick,
  broadcastMatchEvent,
} from '../sockets/broadcast';
import { simulateMatch } from '../engine/simulateMatch';
import {
  MatchdayType,
  GameState,
  GameStage,
  MatchEventType,
  type SaveGameMatch,
  type MatchState,
} from '@prisma/client';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday) ? MatchdayType.CUP : MatchdayType.LEAGUE;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function setStage(saveGameId: number, stage: GameStage) {
  const updated = await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: stage },
  });

  // Single-row fallback
  if (updated.count === 0) {
    await prisma.gameState.update({
      where: { id: 1 },
      data: { currentSaveGameId: saveGameId, gameStage: stage },
    });
  }

  try {
    broadcastStageChanged({ gameStage: stage }, saveGameId, { alsoGlobal: true });
  } catch {
    /* sockets may not be initialized; ignore */
  }
}

/* -------------------------------------------------------------------------- */
/* Minute-by-minute simulator (used by engine)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Run the minute-by-minute simulation for every match in a given matchday.
 * - Ensures MatchState exists for each match
 * - Uses simulateMatch(...) per minute
 * - Persists MatchEvent rows
 * - Emits `match-tick` and `match-event` for the FE live page
 * - 45' → stage HALFTIME and wait until stage returns to MATCHDAY
 * - 90' → stage RESULTS (engine/route handles post-processing)
 */
export async function simulateMatchday(matchdayId: number): Promise<void> {
  const md = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: {
      id: true,
      saveGameId: true,
      saveGameMatches: { select: { id: true } },
    },
  });
  if (!md) throw new Error(`Matchday ${matchdayId} not found`);

  const saveGameId = md.saveGameId;
  const matchIds = md.saveGameMatches.map((m) => m.id);

  // Ensure states exist before loop
  await Promise.all(matchIds.map((mId) => ensureMatchState(mId)));

  // NEW (defensive): ensure clients see MATCHDAY before ticks start
  await setStage(saveGameId, GameStage.MATCHDAY);

  // Minute loop: 1..90
  for (let minute = 1; minute <= 90; minute++) {
    // Halftime gate at 45' completed (enter 46)
    if (minute === 46) {
      await setStage(saveGameId, GameStage.HALFTIME);

      // Wait until UI/route flips back to MATCHDAY, max ~2 minutes
      const MAX_TRIES = 240;
      for (let i = 0; i < MAX_TRIES; i++) {
        const gs = await prisma.gameState.findFirst({
          where: { currentSaveGameId: saveGameId },
          select: { gameStage: true },
        });
        if (gs?.gameStage === GameStage.MATCHDAY) break;
        await sleep(500);
      }
    }

    // Simulate each match for this minute
    for (const mId of matchIds) {
      const match: SaveGameMatch | null = await prisma.saveGameMatch.findUnique({ where: { id: mId } });
      if (!match) continue;

      let state: MatchState | null = await prisma.matchState.findUnique({ where: { saveGameMatchId: mId } });
      if (!state) state = await ensureMatchState(mId);

      const events = await simulateMatch(match as SaveGameMatch, state as MatchState, minute);

      // Persist and broadcast events
      if (events && events.length > 0) {
        await prisma.$transaction(
          events.map((e) =>
            prisma.matchEvent.create({
              data: {
                saveGameMatchId: match.id,
                minute: e.minute,
                type: e.type as MatchEventType,
                description: e.description,
                saveGamePlayerId: e.saveGamePlayerId ?? null,
              },
            })
          )
        );

        // Broadcast each event with optional player name
        for (const e of events) {
          let player: { id: number; name: string } | null = null;
          if (e.saveGamePlayerId) {
            try {
              const p = await prisma.saveGamePlayer.findUnique({
                where: { id: e.saveGamePlayerId },
                select: { id: true, name: true },
              });
              if (p) player = { id: p.id, name: p.name };
            } catch { /* ignore name lookup failure */ }
          }

          broadcastMatchEvent(saveGameId, {
            matchId: match.id,
            minute: e.minute,
            type: e.type as MatchEventType,
            description: e.description,
            player,
          });
        }
      }

      // Broadcast a tick with the latest scoreline (include legacy `id`)
      const latest = await prisma.saveGameMatch.findUnique({
        where: { id: mId },
        select: { homeGoals: true, awayGoals: true },
      });

      broadcastMatchTick(saveGameId, {
        id: mId, // legacy key
        matchId: mId,
        minute,
        homeGoals: latest?.homeGoals ?? 0,
        awayGoals: latest?.awayGoals ?? 0,
      });
    }

    // Small delay to avoid a tight loop (tune as needed)
    await sleep(300);
  }

  // Mark as played (optional but typical)
  await prisma.saveGameMatch.updateMany({
    where: { id: { in: matchIds } },
    data: { isPlayed: true },
  });

  // Full-time: flip to RESULTS
  await setStage(saveGameId, GameStage.RESULTS);
}


/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Advance only the matchday *number/type* (no simulation).
 * Leaves gameStage as-is.
 * NOTE: This uses the current active GameState. If you need scoped control,
 * add a variant that receives saveGameId explicitly.
 */
export async function advanceMatchdayType() {
  const gameState = await getGameState();
  if (!gameState) throw new Error('Game state not found');

  const nextNumber = gameState.currentMatchday + 1;
  const nextType = getMatchdayTypeForNumber(nextNumber);

  const updated = await prisma.gameState.update({
    where: { id: gameState.id },
    data: {
      currentMatchday: nextNumber,
      matchdayType: nextType,
    },
  });

  return {
    message: `Advanced to matchday ${nextNumber} (${nextType})`,
    matchdayNumber: updated.currentMatchday,
    matchdayType: updated.matchdayType,
  };
}

/**
 * STEP 1: Flip into MATCHDAY and return the new GameState immediately.
 * Also: eagerly create MatchState rows (both sides) so UI has lineups
 * and the simulation can run without user input.
 *
 * After flipping to MATCHDAY, we kick off completeMatchday(saveGameId)
 * in the background so that by the time the UI hits RESULTS and navigates to
 * Standings, the LeagueTable has been updated.
 */
export async function startMatchday(saveGameId: number): Promise<GameState> {
  const state = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!state) {
    throw new Error(`Game state not found for saveGameId ${saveGameId}`);
  }

  // Ensure there’s a matchday to simulate
  const md = await prisma.matchday.findFirst({
    where: {
      number: state.currentMatchday,
      type: getMatchdayTypeForNumber(state.currentMatchday),
      saveGameId,
    },
    include: { saveGameMatches: true },
  });
  if (!md) {
    throw new Error(
      `Matchday ${state.currentMatchday} not found for saveGame ${saveGameId}`
    );
  }

  // EAGER: create/complete MatchState for all matches (both sides)
  await Promise.all(md.saveGameMatches.map((m) => ensureMatchState(m.id)));

  // Flip stage to MATCHDAY for this save
  const updated = await prisma.gameState.update({
    where: { id: state.id },
    data: { gameStage: GameStage.MATCHDAY },
  });

  // Kick off the engine loop (drives minute-by-minute + stage flips)
  startOrResumeMatchday(saveGameId);

  // Fire-and-forget post-sim updates (will wait for RESULTS stage inside)
  (async () => {
    try {
      await completeMatchday(saveGameId);
    } catch (e) {
      console.error('[matchdayService] completeMatchday failed:', e);
    }
  })();

  return updated;
}

/**
 * STEP 2: Wait for the engine to reach RESULTS, then do post-match updates.
 * We poll GameState for this save until stage === RESULTS (or timeout).
 * Do NOT increment here if the UI will show STANDINGS and then call finalizeStandings().
 */
export async function completeMatchday(saveGameId: number): Promise<string> {
  const state = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!state) {
    throw new Error(`Game state not found for saveGameId ${saveGameId}`);
  }

  const currentMatchday = state.currentMatchday;
  const matchdayType = getMatchdayTypeForNumber(currentMatchday);

  const matchday = await prisma.matchday.findFirst({
    where: { number: currentMatchday, type: matchdayType, saveGameId },
    include: { saveGameMatches: true },
  });
  if (!matchday) {
    return 'Season complete. No more matchday.';
  }

  // Wait for engine to finish (stage RESULTS) — up to ~2 minutes
  const MAX_TRIES = 240; // 240 * 500ms = 120s
  for (let i = 0; i < MAX_TRIES; i++) {
    const gs = await prisma.gameState.findFirst({
      where: { currentSaveGameId: saveGameId },
      select: { gameStage: true },
    });
    if (gs?.gameStage === GameStage.RESULTS) break;
    await sleep(500);
  }

  // League table / cup updates
  if (matchdayType === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(saveGameId, matchday.id);
  }
  await updateMoraleAndContracts(matchday.id, saveGameId);

  return `Completed matchday ${currentMatchday}`;
}

/**
 * Called after the StandingsPage grace period.
 * - If currentMatchday < 21: increments to next day, sets stage ACTION, updates type.
 * - If currentMatchday === 21: resets for a new season (fresh fixtures, league table, cup).
 * Returns the updated GameState.
 */
export async function finalizeStandingsAndAdvance(saveGameId: number): Promise<GameState> {
  const state = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!state) {
    throw new Error(`Game state not found for saveGameId ${saveGameId}`);
  }

  if (state.currentMatchday >= 21) {
    // Season rollover
    await resetForNewSeason(saveGameId);
  } else {
    const nextMatchday = state.currentMatchday + 1;
    await prisma.gameState.update({
      where: { id: state.id },
      data: {
        currentMatchday: nextMatchday,
        matchdayType: getMatchdayTypeForNumber(nextMatchday),
        gameStage: GameStage.ACTION,
      },
    });
  }

  const updated = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!updated) throw new Error('Game state missing after advance');
  return updated;
}

/**
 * Alias requested by FE/route layer:
 * Increment currentMatchday, recalc matchdayType, and set gameStage: ACTION (no simulation).
 * If the season has ended, roll over to a fresh season.
 */
export async function finalizeStandings(saveGameId: number): Promise<GameState> {
  return finalizeStandingsAndAdvance(saveGameId);
}

/**
 * Reset everything that must be fresh at the start of a new season for this save:
 * - Increment season
 * - Reset currentMatchday → 1, matchdayType → LEAGUE, stage → ACTION
 * - Clear ALL fixtures (events → states → matches → matchdays) for this save
 * - Reset/initialize league table for D1–D4
 * - Regenerate a full season (league + cup)
 */
export async function resetForNewSeason(saveGameId: number): Promise<void> {
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!gs) throw new Error(`GameState not found for saveGameId ${saveGameId}`);

  // 1) Delete existing fixtures for this save (events -> states -> matches -> matchdays)
  const matchIdsRows = await prisma.saveGameMatch.findMany({
    where: { saveGameId },
    select: { id: true },
  });
  const matchIds = matchIdsRows.map((r) => r.id);

  if (matchIds.length > 0) {
    await prisma.matchEvent.deleteMany({ where: { saveGameMatchId: { in: matchIds } } });
    await prisma.matchState.deleteMany({ where: { saveGameMatchId: { in: matchIds } } });
    await prisma.saveGameMatch.deleteMany({ where: { id: { in: matchIds } } });
  }

  await prisma.matchday.deleteMany({ where: { saveGameId } });

  // 2) Reset league table (fresh rows for all D1–D4 teams)
  await prepareLeagueTableForNewSeason(saveGameId);

  // 3) Increment season & reset counters/stage
  await prisma.gameState.update({
    where: { id: gs.id },
    data: {
      season: gs.season + 1,
      currentMatchday: 1,
      matchdayType: MatchdayType.LEAGUE,
      gameStage: GameStage.ACTION,
    },
  });

  // 4) Rebuild a full season (league + cup fixtures/bracket)
  const teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId },
    orderBy: { id: 'asc' },
  });
  await generateFullSeason(saveGameId, teams);
}

/* ------------------------------ Fixtures API ------------------------------- */

type FixtureEvent = {
  id: number;
  minute: number;
  type: string;
  description: string;
};

export type FixtureWithExtras = {
  id: number;
  saveGameId: number;
  matchdayId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  events: FixtureEvent[];
};

export async function getMatchdayFixtures(
  saveGameId: number,
  matchdayNumber?: number,
  matchdayType?: MatchdayType
): Promise<FixtureWithExtras[]> {
  // Derive current number/type only for THIS saveGameId
  let number = matchdayNumber;
  let type = matchdayType;

  if (number == null || type == null) {
    const state = await prisma.gameState.findFirst({
      where: { currentSaveGameId: saveGameId },
      select: { currentMatchday: true, matchdayType: true },
    });
    if (!state) throw new Error('Game state not initialized for this saveGameId');

    number ??= state.currentMatchday;
    type ??= state.matchdayType;
  }

  const md = await prisma.matchday.findFirst({
    where: { number, type, saveGameId },
    select: { id: true },
  });
  if (!md) throw new Error(`Matchday ${number} (${type}) not found for save ${saveGameId}`);

  // Fetch matches (scoped to save + matchday)
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId: md.id, saveGameId },
    select: {
      id: true,
      saveGameId: true,
      matchdayId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
    },
    orderBy: { id: 'asc' },
  });

  if (matches.length === 0) return [];

  // Team names
  const teamIds = Array.from(new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId])));
  const teams = await prisma.saveGameTeam.findMany({
    where: { id: { in: teamIds }, saveGameId },
    select: { id: true, name: true },
  });
  const nameById = new Map<number, string>(teams.map((t) => [t.id, t.name]));

  // Events per match
  const matchIds = matches.map((m) => m.id);
  const events = await prisma.matchEvent.findMany({
    where: { saveGameMatchId: { in: matchIds } },
    orderBy: [{ minute: 'asc' }, { id: 'asc' }],
    select: { id: true, minute: true, type: true, description: true, saveGameMatchId: true },
  });
  const eventsByMatch = new Map<number, FixtureEvent[]>();
  for (const e of events) {
    const list = eventsByMatch.get(e.saveGameMatchId) ?? [];
    list.push({ id: e.id, minute: e.minute, type: String(e.type), description: e.description });
    eventsByMatch.set(e.saveGameMatchId, list);
  }

  // Build payload
  const payload: FixtureWithExtras[] = matches.map((m) => ({
    ...m,
    homeTeam: { id: m.homeTeamId, name: nameById.get(m.homeTeamId) ?? String(m.homeTeamId) },
    awayTeam: { id: m.awayTeamId, name: nameById.get(m.awayTeamId) ?? String(m.awayTeamId) },
    events: eventsByMatch.get(m.id) ?? [],
  }));

  return payload;
}

/**
 * Get the matchId and home/away flag for a team on a given matchday.
 * Strictly scoped by saveGameId to avoid cross-save conflicts.
 */
export async function getTeamMatchInfo(
  saveGameId: number,
  matchdayNumber: number,
  teamId: number
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  const matchdayType = getMatchdayTypeForNumber(matchdayNumber);
  const md = await prisma.matchday.findFirst({
    where: { number: matchdayNumber, type: matchdayType, saveGameId },
    include: { saveGameMatches: true },
  });
  if (!md) throw new Error('Matchday not found');

  const m = md.saveGameMatches.find((x) => x.homeTeamId === teamId || x.awayTeamId === teamId);
  if (!m) throw new Error('Match not found for this team');

  return { matchId: m.id, isHomeTeam: m.homeTeamId === teamId };
}
