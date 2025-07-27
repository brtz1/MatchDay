// backend/src/routes/standingsRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import { getStandingsGrouped } from '../services/standingsService';

const router = Router();

/**
 * GET /api/standings?saveGameId=xx
 * Returns current standings grouped by division for the given save game.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try saveGameId from query param, fallback to current game state if not set
    const saveGameId = req.query.saveGameId
      ? Number(req.query.saveGameId)
      : undefined;
    const standings = await getStandingsGrouped(saveGameId);
    res.status(200).json(standings);
  } catch (error) {
    console.error('❌ Error loading standings:', error);
    next(error);
  }
});

export default router;
