// backend/src/services/matchdayService.ts

import prisma from '../utils/prisma';
import { simulateMatchday } from './matchService';
import { updateLeagueTableForMatchday } from './leagueTableService';
import { updateMoraleAndContracts } from './moraleContractService';
import { getGameState } from './gameState';
import {
  MatchdayType,
  SaveGameMatch,
  GameState,
  GameStage,
} from '@prisma/client';

/** Determines LEAGUE vs CUP days by number */
function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday)
    ? MatchdayType.CUP
    : MatchdayType.LEAGUE;
}

/**
 * Advance only the matchday *number/type* (no simulation).
 * Leaves gameStage as-is.
 */
export async function advanceMatchdayType() {
  const gameState = await prisma.gameState.findFirst({
    where: { currentSaveGameId: { not: null as any } },
  });
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
 */
export async function startMatchday(saveGameId: number): Promise<GameState> {
  const state = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });
  if (!state) {
    throw new Error(`Game state not found for saveGameId ${saveGameId}`);
  }

  // ensure there’s a matchday to simulate
  const md = await prisma.matchday.findFirst({
    where: {
      number: state.currentMatchday,
      type: getMatchdayTypeForNumber(state.currentMatchday),
      saveGameId,
    },
  });
  if (!md) {
    throw new Error(
      `Matchday ${state.currentMatchday} not found for saveGame ${saveGameId}`
    );
  }

  // flip stage to MATCHDAY
  const updated = await prisma.gameState.update({
    where: { id: state.id },
    data: { gameStage: GameStage.MATCHDAY },
  });

  return updated;
}

/**
 * STEP 2: Perform the simulation & post-match updates, then bump to next ACTION.
 */
export async function completeMatchday(
  saveGameId: number
): Promise<string> {
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

  // simulate all matches
  await simulateMatchday(matchday.id);

  // league table / cup bracket updates
  if (matchdayType === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(matchday.id, saveGameId);
  }
  await updateMoraleAndContracts(matchday.id, saveGameId);

  // advance to next matchday & reset to ACTION
  const nextMatchday = currentMatchday + 1;
  const nextType = getMatchdayTypeForNumber(nextMatchday);
  await prisma.gameState.update({
    where: { id: state.id },
    data: {
      currentMatchday: nextMatchday,
      matchdayType: nextType,
      gameStage: GameStage.ACTION,
    },
  });

  return `Completed matchday ${currentMatchday}`;
}

/**
 * Fetch fixtures (matches + events) for a given or current matchday.
 */
export async function getMatchdayFixtures(
  matchdayNumber?: number,
  matchdayType?: MatchdayType
): Promise<
  (SaveGameMatch & {
    homeTeam: { id: number; name: string };
    awayTeam: { id: number; name: string };
    MatchEvent: {
      id: number;
      minute: number;
      eventType: string;
      description: string;
    }[];
  })[]
> {
  const state = await getGameState();
  if (!state) throw new Error('Game state not initialized');

  const number = matchdayNumber ?? state.currentMatchday;
  const type = matchdayType ?? state.matchdayType;

  const md = await prisma.matchday.findFirst({
    where: {
      number,
      type,
      saveGameId: state.currentSaveGameId ?? undefined,
    },
  });
  if (!md) throw new Error(`Matchday ${number} (${type}) not found`);

  return prisma.saveGameMatch.findMany({
    where: {
      matchdayId: md.id,
      saveGameId: state.currentSaveGameId ?? undefined,
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      MatchEvent: {
        orderBy: { minute: 'asc' },
        select: {
          id: true,
          minute: true,
          eventType: true,
          description: true,
        },
      },
    },
  });
}

/**
 * Get the matchId and home/away flag for a team on a given matchday.
 */
export async function getTeamMatchInfo(
  saveGameId: number,
  matchdayNumber: number,
  teamId: number
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  const matchdayType = getMatchdayTypeForNumber(matchdayNumber);
  const md = await prisma.matchday.findFirst({
    where: {
      number: matchdayNumber,
      type: matchdayType,
      saveGameId,
    },
    include: { saveGameMatches: true },
  });
  if (!md) throw new Error('Matchday not found');

  const m = md.saveGameMatches.find(
    (x) => x.homeTeamId === teamId || x.awayTeamId === teamId
  );
  if (!m) throw new Error('Match not found for this team');

  return { matchId: m.id, isHomeTeam: m.homeTeamId === teamId };
}
