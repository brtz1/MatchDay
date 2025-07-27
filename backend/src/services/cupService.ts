import prisma from '../utils/prisma';
import { MatchdayType } from '@prisma/client';

/**
 * Retrieves the full cup bracket for the given saveGameId,
 * grouped by round (matchday number).
 */
export async function getCupLog(saveGameId: number) {
  const matchdays = await prisma.matchday.findMany({
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

  return matchdays.map((md) => ({
    matchdayNumber: md.number,
    stage: mapCupStage(md.number),
    matches: md.saveGameMatches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
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
    3: 'Round of 128',
    6: 'Round of 64',
    8: 'Round of 32',
    11: 'Round of 16',
    14: 'Quarterfinal',
    17: 'Semifinal',
    20: 'Final',
  };
  return stageMap[number] ?? `Matchday ${number}`;
}
