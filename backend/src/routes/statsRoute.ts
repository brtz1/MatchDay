// backend/src/routes/statsRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * GET /api/stats
 * Returns aggregated goals, assists, yellow/red cards, and injuries per player across all matches.
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await prisma.playerMatchStats.findMany({
        include: { player: true },
      });

      const totals = new Map<
        number,
        {
          id: number;
          name: string;
          nationality: string;
          position: string;
          goals: number;
          assists: number;
          yellow: number;
          red: number;
          injuries: number;
        }
      >();

      for (const stat of stats) {
        const current =
          totals.get(stat.playerId) ?? {
            id: stat.playerId,
            name: stat.player.name,
            nationality: stat.player.nationality,
            position: stat.player.position,
            goals: 0,
            assists: 0,
            yellow: 0,
            red: 0,
            injuries: 0,
          };

        current.goals += stat.goals;
        current.assists += stat.assists;
        current.yellow += stat.yellow;
        current.red += stat.red;
        current.injuries += stat.injuries ?? 0;

        totals.set(stat.playerId, current);
      }

      const list = Array.from(totals.values());
      list.sort((a, b) => (b.goals !== a.goals ? b.goals - a.goals : b.assists - a.assists));

      res.status(200).json(list);
    } catch (error) {
      console.error('❌ Error loading player stats:', error);
      next(error);
    }
  }
);

/**
 * GET /api/stats/:playerId
 * Returns all match stats for a single player (array of match stats, including injuries).
 */
router.get(
  '/:playerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const playerId = Number(req.params.playerId);
      if (!playerId) return res.status(400).json({ error: "Invalid playerId" });

      const stats = await prisma.playerMatchStats.findMany({
        where: { playerId },
        orderBy: { matchId: "asc" },
        select: {
          id: true,
          matchId: true,
          goals: true,
          assists: true,
          yellow: true,
          red: true,
          injuries: true,
        },
      });

      res.status(200).json(stats);
    } catch (error) {
      console.error('❌ Error loading stats for player:', error);
      next(error);
    }
  }
);

export default router;
