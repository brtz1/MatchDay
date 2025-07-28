import prisma from '../utils/prisma';
import { MatchdayType } from '@prisma/client';

/**
 * Retrieves the full cup bracket for the given saveGameId,
 * grouped by round (matchday number).
 */
export async function getCupLog(saveGameId: number) {
  const matchday = await prisma.matchday.findMany({
    where: {
      type: MatchdayType.CUP,
      saveGameMatches: {
        some: {
          saveGameId,
        },
      },
    },
    orderBy: { number: 'asc' },
    include: {
      saveGameMatches: {
        where: { saveGameId },
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
  });

  return matchday.map((md) => ({
    matchdayNumber: md.number,
    stage: mapCupStage(md.number),
    matches: md.saveGameMatches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam.name,
      homeTeamId: m.homeTeam.id,
      awayTeam: m.awayTeam.name,
      awayTeamId: m.awayTeam.id,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      isPlayed: m.played,
    })),
  }));
}

/**
 * Maps actual matchday numbers (3, 6, 8...) to their cup stage name.
 */
function mapCupStage(number: number): string {
  const stageMap: Record<number, string> = {
    15: 'Round of 128',
    16: 'Round of 64',
    17: 'Round of 32',
    18: 'Round of 16',
    19: 'Quarterfinal',
    20: 'Semifinal',
    21: 'Final',
  };
  return stageMap[number] ?? `Matchday ${number}`;
}

