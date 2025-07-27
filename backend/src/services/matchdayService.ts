// backend/src/services/matchdayService.ts

import prisma from '../utils/prisma';
import { simulateMatchday } from './matchService';
import { updateLeagueTableForMatchday } from './leagueTableService';
import { updateMoraleAndContracts } from './moraleContractService';
import { getGameState } from './gameState';
import { MatchdayType, SaveGameMatch } from '@prisma/client';

/**
 * Matchday number → match type logic
 * Every season has 21 matchdays: 14 league, 7 cup
 */
function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday) ? MatchdayType.CUP : MatchdayType.LEAGUE;
}

/**
 * Only advances the matchday type and number — no simulation
 */
export async function advanceMatchdayType() {
  const gameState = await prisma.gameState.findFirst({
    where: { currentSaveGameId: { not: undefined } },
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
 * Full matchday simulation + standings + morale + advance number/type
 */
export async function advanceMatchday(saveGameId: number): Promise<string> {
  const state = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
  });

  if (!state) throw new Error('Game state not found for saveGameId ' + saveGameId);

  const currentMatchday = state.currentMatchday;
  const matchdayType = getMatchdayTypeForNumber(currentMatchday);

  const matchday = await prisma.matchday.findFirst({
    where: {
      number: currentMatchday,
      type: matchdayType,
      saveGameMatches: {
        some: { saveGameId },
      },
    },
    orderBy: { number: 'asc' },
  });

  if (!matchday) {
    return 'Season complete. No more matchdays.';
  }

  // 1. Simulate matches
  await simulateMatchday(matchday.id);

  // 2. League table update
  if (matchdayType === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(matchday.id, saveGameId);
  }

  // 3. Morale and contracts
  await updateMoraleAndContracts(matchday.id, saveGameId);

  // 4. Advance matchday
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

  return `Matchday ${currentMatchday} (${matchdayType}) simulated for saveGame ${saveGameId}.`;
}

/**
 * Retrieve fixtures for current or specified matchday.
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
  if (!state) throw new Error('Game state not initialized');

  const number = matchdayNumber ?? state.currentMatchday;
  const type = matchdayType ?? state.matchdayType;

  const matchday = await prisma.matchday.findFirst({
    where: {
      number,
      type,
      saveGameMatches: {
        some: { saveGameId: state.currentSaveGameId },
      },
    },
  });

  if (!matchday) throw new Error(`Matchday ${number} (${type}) not found`);

  return prisma.saveGameMatch.findMany({
    where: {
      matchdayId: matchday.id,
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
}

/**
 * Used to retrieve the coach's match for the current matchday.
 * Returns matchId and if the team is home.
 */
export async function getTeamMatchInfo(
  saveGameId: number,
  matchdayNumber: number,
  teamId: number
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  try {
    const state = await getGameState();
    if (!state) throw new Error('Game state not initialized');

    const matchdayType = getMatchdayTypeForNumber(matchdayNumber);
    console.log(`🔍 Looking for matchday: #${matchdayNumber}, type=${matchdayType}, saveGameId=${saveGameId}`);

    const matchday = await prisma.matchday.findFirst({
      where: {
        number: matchdayNumber,
        type: matchdayType,
        saveGameId: saveGameId,
      },
      include: {
        saveGameMatches: true,
      },
    });

    if (!matchday) {
      console.warn('⚠️ No matchday found');
      throw new Error('Matchday not found');
    }

    console.log(`✅ Matchday found: ID ${matchday.id}, total matches: ${matchday.saveGameMatches.length}`);

    const match = matchday.saveGameMatches.find(
      (m) => m.homeTeamId === teamId || m.awayTeamId === teamId
    );

    if (!match) {
      console.warn(`⚠️ No match found for team ${teamId}`);
      throw new Error('Match not found for team');
    }

    return {
      matchId: match.id,
      isHomeTeam: match.homeTeamId === teamId,
    };
  } catch (err) {
    console.error('❌ getTeamMatchInfo failed:', err);
    throw err;
  }
}

