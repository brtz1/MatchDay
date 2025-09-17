// backend/src/services/matchdayService.ts

import prisma from '../utils/prisma';
import { updateLeagueTableForMatchday, prepareLeagueTableForNewSeason } from './leagueTableService';
import { updateMoraleAndContracts } from './moraleContractService';
import { getGameState } from './gameState';
import { generateFullSeason } from './fixtureServices';
import { startOrResumeMatchday } from './matchService'; // ← single engine source of truth
import { maybeAdvanceCupAfterRound } from './cupBracketService';

import {
  MatchdayType,
  GameState,
  GameStage,
} from '@prisma/client';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Keep these numbers aligned with cupBracketService CUP_CALENDAR_NUMBERS. */
function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 9, 12, 15, 18, 21];
  return cupDays.includes(matchday) ? MatchdayType.CUP : MatchdayType.LEAGUE;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

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
 * Start the matchday engine and asynchronously run post-processing (tables, morale).
 * Engine responsibility (ticks/pauses/ET/Pens/stage flips) is centralized in matchService.ts.
 */
export async function startMatchday(saveGameId: number): Promise<GameState> {
  const state = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!state) {
    throw new Error(`Game state not found for saveGameId ${saveGameId}`);
  }

  const md = await prisma.matchday.findFirst({
    where: {
      number: state.currentMatchday,
      type: getMatchdayTypeForNumber(state.currentMatchday),
      saveGameId,
    },
    select: { id: true },
  });
  if (!md) {
    throw new Error(
      `Matchday ${state.currentMatchday} not found for saveGame ${saveGameId}`
    );
  }

  // Optional: set stage early so FE flips immediately; engine will broadcast too.
  const updated = await prisma.gameState.update({
    where: { id: state.id },
    data: { gameStage: GameStage.MATCHDAY },
  });

  // Kick off the engine loop
  startOrResumeMatchday(saveGameId).catch((e) => {
    // Avoid throwing to caller; log and continue
    console.error('[matchdayService] startOrResumeMatchday failed:', e);
  });

  // Fire-and-forget post-processing once RESULTS is reached
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
 * Wait for engine to reach RESULTS, then:
 *  - update league table (for LEAGUE)
 *  - update morale/contracts
 *  - advance CUP bracket rounds (for CUP)
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

  if (matchdayType === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(saveGameId, matchday.id);
  }

  await updateMoraleAndContracts(matchday.id, saveGameId);

  if (matchdayType === MatchdayType.CUP) {
    const cupMd = await prisma.matchday.findFirst({
      where: { id: matchday.id },
      select: { roundLabel: true },
    });

    if (cupMd?.roundLabel) {
      await maybeAdvanceCupAfterRound(saveGameId, cupMd.roundLabel as any);
    }
  }

  return `Completed matchday ${currentMatchday}`;
}

/**
 * Called when RESULTS are acknowledged on the FE and we should return to ACTION.
 * Also handles season rollover when currentMatchday >= 21.
 */
export async function finalizeStandingsAndAdvance(saveGameId: number): Promise<GameState> {
  const state = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!state) {
    throw new Error(`Game state not found for saveGameId ${saveGameId}`);
  }

  if (state.currentMatchday >= 21) {
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

/** Alias requested by FE/route layer. */
export async function finalizeStandings(saveGameId: number): Promise<GameState> {
  return finalizeStandingsAndAdvance(saveGameId);
}

/**
 * Season rollover:
 *  - wipe matches/events/states + matchdays for this save
 *  - prepare league table
 *  - increment season, reset matchday to 1, stage to ACTION
 *  - regenerate fixtures
 */
export async function resetForNewSeason(saveGameId: number): Promise<void> {
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!gs) throw new Error(`GameState not found for saveGameId ${saveGameId}`);

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

  await prepareLeagueTableForNewSeason(saveGameId);

  await prisma.gameState.update({
    where: { id: gs.id },
    data: {
      season: gs.season + 1,
      currentMatchday: 1,
      matchdayType: MatchdayType.LEAGUE,
      gameStage: GameStage.ACTION,
    },
  });

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

  const teamIds = Array.from(new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId])));
  const teams = await prisma.saveGameTeam.findMany({
    where: { id: { in: teamIds }, saveGameId },
    select: { id: true, name: true },
  });
  const nameById = new Map<number, string>(teams.map((t) => [t.id, t.name]));

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

  const payload: FixtureWithExtras[] = matches.map((m) => ({
    ...m,
    homeTeam: { id: m.homeTeamId, name: nameById.get(m.homeTeamId) ?? String(m.homeTeamId) },
    awayTeam: { id: m.awayTeamId, name: nameById.get(m.awayTeamId) ?? String(m.awayTeamId) },
    events: eventsByMatch.get(m.id) ?? [],
  }));

  return payload;
}

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
