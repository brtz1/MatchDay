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

    const result = divisions.map((division) => ({
      division: division.name,
      teams: division.teams
        .map((SaveGameTeam) => ({
          name: SaveGameTeam.name,
          points: SaveGameTeam.leagueTable?.points ?? 0,
          played: SaveGameTeam.leagueTable?.played ?? 0,
          wins: SaveGameTeam.leagueTable?.wins ?? 0,
          draws: SaveGameTeam.leagueTable?.draws ?? 0,
          losses: SaveGameTeam.leagueTable?.losses ?? 0,
          goalsFor: SaveGameTeam.leagueTable?.goalsFor ?? 0,
          goalsAgainst: SaveGameTeam.leagueTable?.goalsAgainst ?? 0,
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
