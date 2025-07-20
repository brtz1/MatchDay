// src/services/matchdayService.ts

import prisma from '../utils/prisma';
import { simulateMatchday } from './matchService';
import { updateLeagueTableForMatchday } from './leagueTableService';
import { updateMoraleAndContracts } from './moraleContractService';
import {
  getGameState,
  advanceToNextMatchday,
} from './gameState';
import { MatchdayType, SaveGameMatch } from '@prisma/client';

/**
 * Matchday number → match type logic
 * Every season has 21 matchdays: 14 league, 7 cup
 */
function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday) ? MatchdayType.CUP : MatchdayType.LEAGUE;
}

export async function advanceMatchdayType() {
  const gameState = await prisma.gameState.findFirst({
    where: { currentSaveGameId: { not: undefined } },
  });

  if (!gameState) throw new Error('Game state not found');

  const nextNumber = gameState.currentMatchday + 1;
  const nextType: MatchdayType =
    gameState.matchdayType === 'LEAGUE' ? 'CUP' : 'LEAGUE';

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
 * Simulates the current matchday, updates tables/contracts, and advances state.
 *
 * @returns a human-readable message about what was simulated.
 */
export async function advanceMatchday(): Promise<string> {
  const state = await getGameState();
  const currentMatchday = state.currentMatchday;

  const matchdayType = getMatchdayTypeForNumber(currentMatchday);

  // find the Matchday record
  const matchday = await prisma.matchday.findFirst({
    where: {
      number: currentMatchday,
      type: matchdayType,
      saveGameMatches: {
        some: { saveGameId: state.currentSaveGameId }
      }
    },
    orderBy: { number: 'asc' },
  });

  if (!matchday) {
    return 'Season complete. No more matchdays.';
  }

  // 1) simulate all matches in the current matchday
  await simulateMatchday(matchday.id);

  // 2) update league standings only for league matches
  if (matchdayType === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(matchday.id);
  }

  // 3) apply morale, injury, and contract logic
  await updateMoraleAndContracts(matchday.id);

  // 4) increment matchday and update its type in GameState
  const nextMatchday = currentMatchday + 1;
  const nextType = getMatchdayTypeForNumber(nextMatchday);

  await prisma.gameState.update({
    where: { id: state.id },
    data: {
      currentMatchday: nextMatchday,
      matchdayType: nextType,
      gameStage: 'ACTION',
    },
  });

  return `Matchday ${currentMatchday} (${matchdayType}) simulated.`;
}

/**
 * Retrieves all fixtures for a given matchday.
 *
 * If matchdayNumber or matchdayType is omitted, uses current state.
 */
export async function getMatchdayFixtures(
  matchdayNumber?: number,
  matchdayType?: MatchdayType
): Promise<(SaveGameMatch & {
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  MatchEvent: { id: number; minute: number; eventType: string; description: string }[];
})[]> {
  const state = await getGameState();
  const number = matchdayNumber ?? state.currentMatchday;
  const type = matchdayType ?? state.matchdayType;

  // Find the Matchday record
  const md = await prisma.matchday.findFirst({
    where: {
      number,
      type,
      saveGameMatches: {
        some: { saveGameId: state.currentSaveGameId }
      }
    },
  });

  if (!md) {
    throw new Error(`Matchday ${number} of type ${type} not found`);
  }

  // Fetch all fixtures from saveGameMatch for this matchday
  const fixtures = await prisma.saveGameMatch.findMany({
    where: {
      matchdayId: md.id,
      saveGameId: state.currentSaveGameId,
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

  return fixtures;
}

export async function getTeamMatchInfo(
  saveGameId: number,
  matchdayNumber: number,
  teamId: number
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  const state = await getGameState();

  const matchdayType = getMatchdayTypeForNumber(matchdayNumber);

  const matchday = await prisma.matchday.findFirst({
    where: {
      number: matchdayNumber,
      type: matchdayType,
      saveGameMatches: {
        some: { saveGameId },
      },
    },
    include: {
      saveGameMatches: true,
    },
  });

  if (!matchday) {
    throw new Error("Matchday not found");
  }

  const match = matchday.saveGameMatches.find(
    (m) => m.homeTeamId === teamId || m.awayTeamId === teamId
  );

  if (!match) {
    throw new Error("No match found for team on this matchday");
  }

  return {
    matchId: match.id,
    isHomeTeam: match.homeTeamId === teamId,
  };
}
