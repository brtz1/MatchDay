// backend/src/routes/cupRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import { getCupLog } from '../services/cupService';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * GET /api/cup/log
 * Returns full cup tournament results grouped by stage (matchday).
 */
router.get('/log', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = await getCurrentSaveGameId(); // ✅ Fetch current save ID
    const cupLog = await getCupLog(saveGameId);       // ✅ Pass it to service
    res.status(200).json(cupLog);
  } catch (error) {
    console.error('❌ Error fetching cup log:', error);
    next(error);
  }
});

export default router;
