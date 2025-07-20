// backend/src/routes/standingsRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import { getStandings } from '@/services/standingsService';

const router = Router();

/**
 * GET /api/standings
 * Returns the current standings for the active save & matchday.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await getStandings();
    res.status(200).json(table);
  } catch (error) {
    console.error('❌ Error loading standings:', error);
    next(error);
  }
});

export default router;
