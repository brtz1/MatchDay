// src/routes/matchGeneratorRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * Generate league and cup matches based on existing matchdays
 */
router.post('/generate-matches', async (_req, res) => {
  try {
    const saveGameId = await getCurrentSaveGameId();

    // 1. League matches
    const divisions = await prisma.division.findMany({
      where: {
        level: { lte: 4 },
      },
      include: {
        teams: true,
      },
    });

    let matchdayCounter = 1;

    for (const division of divisions) {
      const teams = division.teams;
      const fixtures = createDoubleRoundRobinFixtures(teams.map(t => t.id));

      for (let i = 0; i < fixtures.length; i++) {
        const matchday = await prisma.matchday.create({
          data: {
            number: matchdayCounter++,
            type: 'LEAGUE',
            date: new Date(),
          },
        });

        for (const [home, away] of fixtures[i]) {
          await prisma.match.create({
            data: {
              homeTeamId: home,
              awayTeamId: away,
              matchdayId: matchday.id,
              season: 1,
              matchDate: new Date(),
            },
          });
        }
      }
    }

    // 2. Cup matches
    const allTeams = await prisma.team.findMany();
    let roundTeams = allTeams.map(t => t.id);

    const CUP_ROUND_NAMES = [
      'Round of 128',
      'Round of 64',
      'Round of 32',
      'Round of 16',
      'Quarterfinal',
      'Semifinal',
      'Final',
    ];

    for (let i = 0; i < CUP_ROUND_NAMES.length; i++) {
      const roundName = CUP_ROUND_NAMES[i];

      const matchday = await prisma.matchday.create({
        data: {
          number: matchdayCounter++,
          type: 'CUP',
          date: new Date(),
        },
      });

      const shuffled = [...roundTeams].sort(() => Math.random() - 0.5);
      const nextRoundTeams: number[] = [];

      for (let j = 0; j < shuffled.length; j += 2) {
        const home = shuffled[j];
        const away = shuffled[j + 1];
        if (!away) break;

        await prisma.match.create({
          data: {
            homeTeamId: home,
            awayTeamId: away,
            matchdayId: matchday.id,
            season: 1,
            matchDate: new Date(),
          },
        });

        nextRoundTeams.push(Math.random() < 0.5 ? home : away);
      }

      roundTeams = nextRoundTeams;
    }

    res.json({ message: 'Matches successfully generated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate matches' });
  }
});

function createDoubleRoundRobinFixtures(teamIds: number[]): [number, number][][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(-1); // bye week

  const totalRounds = teams.length - 1;
  const half = teams.length / 2;
  const schedule: [number, number][][] = [];

  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      if (home !== -1 && away !== -1) roundMatches.push([home, away]);
    }
    schedule.push(roundMatches);
    teams.splice(1, 0, teams.pop()!);
  }

  const secondLeg = schedule.map(round => round.map(([h, a]) => [a, h] as [number, number]));
  return [...schedule, ...secondLeg];
}

export default router;
