import express, { Request, Response, NextFunction } from 'express';
import * as matchdayService from '../services/matchdayService';

const router = express.Router();

/**
 * POST /api/matchdays/advance
 * Advances the current matchday: simulates all fixtures, updates results, league tables, and cup bracket.
 */
router.post('/advance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = await matchdayService.advanceMatchday();
    res.status(200).json({ message });
  } catch (error) {
    console.error('❌ Failed to advance matchday:', error);
    next(error);
  }
});

/**
 * GET /api/matchdays
 * Optionally fetch fixtures or results for a given matchday number
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { number, type } = req.query;
    const matchdayNumber = number ? Number(number) : undefined;
    const matchdayType = type ? String(type) as any : undefined;

    const fixtures = await matchdayService.getMatchdayFixtures(matchdayNumber, matchdayType);
    res.status(200).json(fixtures);
  } catch (error) {
    console.error('❌ Error fetching matchday fixtures:', error);
    next(error);
  }
});

export default router;
