// backend/src/routes/cupRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import { getCupLog } from '../services/cupService';
import { getGameState } from '../services/gameState';

const router = Router();

/**
 * GET /api/cup/log
 * Returns full cup tournament results grouped by stage (matchday).
 */
router.get('/log', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const gameState = await getGameState();

    if (!gameState || !gameState.currentSaveGameId || gameState.currentSaveGameId <= 0) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const cupLog = await getCupLog(gameState.currentSaveGameId);
    res.status(200).json(cupLog);
  } catch (error) {
    console.error('❌ Error fetching cup log:', error);
    next(error);
  }
});

export default router;
