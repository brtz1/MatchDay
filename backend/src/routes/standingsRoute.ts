// src/routes/standingsRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * GET /api/standings
 * Returns the current standings grouped by division.
 */
router.get(
  '/standings',
  async (_req: Request, res: Response, next: NextFunction) => {
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
          .sort((a, b) =>
            b.points !== a.points ? b.points - a.points : b.goalsFor - a.goalsFor
          ),
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ Error loading standings:', error);
      next(error);
    }
  }
);

export default router;
