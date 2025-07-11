import express, { Request, Response, NextFunction } from 'express';
import { getGameState, setGameStage } from '../services/gameState';
import { GameStage } from '@prisma/client';

const router = express.Router();

// Legal stage transitions
const stageFlow: Record<GameStage, GameStage> = {
  ACTION: 'MATCHDAY',
  MATCHDAY: 'HALFTIME',
  HALFTIME: 'RESULTS',
  RESULTS: 'STANDINGS',
  STANDINGS: 'ACTION',
};

/**
 * POST /api/gamestate/advance-stage
 * Advances the gameStage according to the defined flow.
 */
router.post('/advance-stage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const current = await getGameState();
    if (!current) {
      return res.status(404).json({ error: 'No GameState found' });
    }

    const currentStage = current.gameStage;
    const nextStage = stageFlow[currentStage] ?? 'ACTION';

    const updated = await setGameStage(nextStage);
    res.status(200).json({ message: `Advanced to ${updated.gameStage}`, gameStage: updated.gameStage });
  } catch (error) {
    console.error('❌ Error advancing game stage:', error);
    next(error);
  }
});

/**
 * GET /api/gamestate
 * Fetches the current GameState record.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await getGameState();
    if (!state) {
      return res.status(404).json({ error: 'GameState not initialized' });
    }
    res.status(200).json(state);
  } catch (error) {
    console.error('❌ Error fetching game state:', error);
    next(error);
  }
});

export default router;
