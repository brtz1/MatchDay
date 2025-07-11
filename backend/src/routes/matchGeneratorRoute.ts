import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = express.Router();

/**
 * POST /api/match-generator/generate
 * Generates league and cup fixtures for the current save game.
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    // 1. League fixtures: 8 teams per division, double round-robin
    const saveGameTeams = await prisma.saveGameTeam.findMany({
      where: { saveGameId },
      include: { baseTeam: true },
    });

    // Group by division
    const divisions = saveGameTeams.reduce<Record<string, number[]>>((acc, team) => {
      const div = team.division;
      if (!acc[div]) acc[div] = [];
      acc[div].push(team.id);
      return acc;
    }, {});

    let matchdayNumber = 1;
    for (const [division, teamIds] of Object.entries(divisions)) {
      const fixtures = createDoubleRoundRobinFixtures(teamIds);
      for (const round of fixtures) {
        const matchday = await prisma.matchday.create({
          data: {
            number: matchdayNumber++,
            type: 'LEAGUE',
            date: new Date(),
          },
        });
        for (const [homeId, awayId] of round) {
          await prisma.saveGameMatch.create({
            data: {
              saveGameId,
              homeTeamId: homeId,
              awayTeamId: awayId,
              matchDate: new Date(),
              matchdayId: matchday.id,
            },
          });
        }
      }
    }

    // 2. Cup fixtures: knockout rounds
    let roundTeams: number[] = saveGameTeams.map((t) => t.id);
    const CUP_ROUNDS = ['Round of 128','Round of 64','Round of 32','Round of 16','Quarterfinal','Semifinal','Final'];

    for (const roundName of CUP_ROUNDS) {
      if (roundTeams.length < 2) break;
      const matchday = await prisma.matchday.create({
        data: {
          number: matchdayNumber++,
          type: 'CUP',
          date: new Date(),
        },
      });

      // Shuffle teams
      const shuffled = [...roundTeams].sort(() => Math.random() - 0.5);
      const winners: number[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        const home = shuffled[i];
        const away = shuffled[i + 1];
        if (!away) break;
        await prisma.saveGameMatch.create({
          data: {
            saveGameId,
            homeTeamId: home,
            awayTeamId: away,
            matchDate: new Date(),
            matchdayId: matchday.id,
          },
        });
        // Random pick winner placeholder
        winners.push(Math.random() < 0.5 ? home : away);
      }
      roundTeams = winners;
    }

    res.status(200).json({ message: 'Matches generated successfully.' });
  } catch (error) {
    console.error('❌ Error generating matches:', error);
    next(error);
  }
});

/**
 * Creates a double round-robin schedule for a list of team IDs.
 */
function createDoubleRoundRobinFixtures(teamIds: number[]): [number, number][][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(-1);
  const rounds: [number, number][][] = [];
  const n = teams.length;
  for (let round = 0; round < n - 1; round++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== -1 && away !== -1) pairs.push([home, away]);
    }
    rounds.push(pairs);
    teams.splice(1, 0, teams.pop()!);
  }
  // second leg
  const secondLeg = rounds.map((r) => r.map(([h, a]) => [a, h] as [number, number]));
  return [...rounds, ...secondLeg];
}

export default router;
