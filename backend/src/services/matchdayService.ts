import prisma from '../utils/prisma';
import { simulateMatchday } from './matchService';
import { updateLeagueTableForMatchday } from './leagueTableService';
import { updateMoraleAndContracts } from './moraleContractService';
import { GameState } from '../state/gameState';
import { MatchdayType } from '@prisma/client';

export async function advanceMatchday(): Promise<string> {
  const state = await GameState.get();
  if (!state) throw new Error('No GameState');

  const matchday = await prisma.matchday.findFirst({
    where: {
      number: state.currentMatchday,
      type: state.matchdayType,
    },
    orderBy: { number: 'asc' },
  });

  if (!matchday) return 'Season complete. No more matchdays.';

  await simulateMatchday(matchday.id);

  if (matchday.type === MatchdayType.LEAGUE) {
    await updateLeagueTableForMatchday(matchday.id);
  }

  await updateMoraleAndContracts(matchday.id);

  return `Matchday ${matchday.number} (${matchday.type}) simulated.`;
}
