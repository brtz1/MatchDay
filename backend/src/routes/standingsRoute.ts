// src/routes/standingsRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

router.get('/standings', async (req, res) => {
  try {
    const divisions = await prisma.division.findMany({
      include: {
        teams: {
          include: {
            leagueTable: true,
          },
        },
      },
      orderBy: { level: 'asc' },
    });

    const result = divisions.map((div) => ({
      division: div.name,
      teams: div.teams
        .map((team) => ({
          name: team.name,
          points: team.leagueTable?.points ?? 0,
          played: team.leagueTable?.played ?? 0,
          wins: team.leagueTable?.wins ?? 0,
          draws: team.leagueTable?.draws ?? 0,
          losses: team.leagueTable?.losses ?? 0,
          goalsFor: team.leagueTable?.goalsFor ?? 0,
          goalsAgainst: team.leagueTable?.goalsAgainst ?? 0,
        }))
        .sort((a, b) => b.points - a.points || b.goalsFor - a.goalsFor),
    }));

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load standings' });
  }
});

export default router;
