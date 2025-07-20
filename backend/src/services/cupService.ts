import prisma from '@/utils/prisma';
import { MatchdayType } from '@prisma/client';

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

function mapCupStage(number: number): string {
  const map: Record<number, string> = {
    1: 'Round of 128',
    2: 'Round of 64',
    3: 'Round of 32',
    4: 'Round of 16',
    5: 'Quarterfinal',
    6: 'Semifinal',
    7: 'Final',
  };
  return map[number] ?? `Matchday ${number}`;
}
