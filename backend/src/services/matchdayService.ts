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
 * Simulates the current matchday, updates tables/contracts, and advances state.
 *
 * @returns a human-readable message about what was simulated.
 */
export async function advanceMatchday(): Promise<string> {
  const state = await getGameState();
  const { currentMatchday, matchdayType } = state;

  // find the Matchday record
  const matchday = await prisma.matchday.findFirst({
    where: { number: currentMatchday, type: matchdayType },
    orderBy: { number: 'asc' },
  });

  if (!matchday) {
    return 'Season complete. No more matchdays.';
  }

  // 1) simulate all save-game matches for this matchday
  await simulateMatchday(matchday.id);

  // 2) update league table if it's a league round
  if (matchday.type === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(matchday.id);
  }

  // 3) update morale and handle contracts/transfers
  await updateMoraleAndContracts(matchday.id);

  // 4) advance to next matchday (resets gameStage to ACTION)
  await advanceToNextMatchday();

  return `Matchday ${matchday.number} (${matchday.type}) simulated.`;
}

/**
 * Retrieves all fixtures for a given matchday.
 *
 * If matchdayNumber or matchdayType is omitted, uses current state.
 *
 * @param matchdayNumber optional matchday number
 * @param matchdayType optional matchday type
 * @returns array of SaveGameMatch records with related teams and events
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
    where: { number, type },
  });
  if (!md) {
    throw new Error(`Matchday ${number} of type ${type} not found`);
  }

  // Fetch save-game matches for that matchday
  const fixtures = await prisma.saveGameMatch.findMany({
    where: { matchdayId: md.id, saveGameId: state.currentSaveGameId },
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
