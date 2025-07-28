// backend/src/services/matchdayService.ts

import prisma from '../utils/prisma';
import { simulateMatchday } from '../services/matchService';
import { updateLeagueTableForMatchday } from '../services/leagueTableService';
import { updateMoraleAndContracts } from '../services/moraleContractService';
import { getGameState } from '../services/gameState';
import { MatchdayType, SaveGameMatch } from '@prisma/client';

function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday) ? MatchdayType.CUP : MatchdayType.LEAGUE;
}

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
      saveGameId,
    },
    include: {
      saveGameMatches: true,
    },
  });

  if (!matchday) return 'Season complete. No more matchday.';

  await simulateMatchday(matchday.id);

  if (matchdayType === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(matchday.id, saveGameId);
  }

  await updateMoraleAndContracts(matchday.id, saveGameId);

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
      saveGameId: state.currentSaveGameId ?? undefined,
    },
  });

  if (!matchday) throw new Error(`Matchday ${number} (${type}) not found`);

  return prisma.saveGameMatch.findMany({
    where: {
      matchdayId: matchday.id,
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

export async function getTeamMatchInfo(
  saveGameId: number,
  matchdayNumber: number,
  teamId: number
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  const state = await getGameState();
  if (!state) throw new Error('Game state not initialized');

  const matchdayType = getMatchdayTypeForNumber(matchdayNumber);
  console.log(`🔍 getTeamMatchInfo → saveGameId: ${saveGameId}, matchday: ${matchdayNumber}, type: ${matchdayType}`);

  const matchday = await prisma.matchday.findFirst({
    where: {
      number: matchdayNumber,
      type: matchdayType,
      saveGameId,
    },
    include: {
      saveGameMatches: true,
    },
  });

  if (!matchday) throw new Error('Matchday not found');

  const match = matchday.saveGameMatches.find(
    (m) => m.homeTeamId === teamId || m.awayTeamId === teamId
  );

  if (!match) throw new Error('Match not found for this team');

  return {
    matchId: match.id,
    isHomeTeam: match.homeTeamId === teamId,
  };
}
