import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { startSeason } from '../controllers/seasonController';

const router = Router();

/**
 * POST /api/season/start
 * Initializes league tables and schedules all fixtures for the current save game.
 */
router.post('/start', startSeason);

/**
 * GET /api/season/matchday
 * Returns all matchday and their matches + events.
 */
router.get(
  '/matchday',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const matchday = await prisma.matchday.findMany({
        include: {
          matches: {
            include: {
              events: true,
            },
          },
        },
        orderBy: { number: 'asc' },
      });

      res.status(200).json(matchday);
    } catch (error) {
      console.error('❌ Error fetching matchday:', error);
      next(error);
    }
  }
);

export default router;
