import express, { Request, Response, NextFunction } from 'express';
import { snapshotCurrentGame } from '../services/snapshotService';

const router = express.Router();

/**
 * POST /api/manual-save
 * Body: { name: string; coachName?: string }
 * Creates a manual save snapshot of the current game state.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, coachName } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Missing or invalid save name' });
      return;
    }

    // ⬇️ Updated: call snapshot with no arguments (if refactored to use gameState internally)
    const saveId = await snapshotCurrentGame();
    res.status(201).json({ saveId, saveName: name });
  } catch (error) {
    console.error('❌ Manual save failed:', error);
    next(error);
  }
});

export default router;
