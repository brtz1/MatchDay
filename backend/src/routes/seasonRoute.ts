// src/routes/seasonRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { startSeason } from '../controllers/seasonController';

const router = Router();

// POST /api/season/start
// Delegate directly to the controller—which has the signature
//   async function startSeason(req: Request, res: Response, next: NextFunction)
router.post('/start', startSeason);

// GET /api/season/matchdays
router.get(
  '/matchdays',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const matchdays = await prisma.matchday.findMany({
        include: {
          matches: { include: { events: true } },
        },
        orderBy: { number: 'asc' },
      });
      res.status(200).json(matchdays);
    } catch (error) {
      console.error('❌ Error fetching matchdays:', error);
      next(error);
    }
  }
);

export default router;
