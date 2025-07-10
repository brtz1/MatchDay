// src/routes/gameStageRoute.ts

import express from 'express';
import { getGameState, setGameStage } from '../services/gameState';

const router = express.Router();

// Define legal game stage transitions
const stageFlow: Record<string, string> = {
  ACTION: 'MATCHDAY',
  MATCHDAY: 'HALFTIME',
  HALFTIME: 'RESULTS',
  RESULTS: 'STANDINGS',
  STANDINGS: 'ACTION',
};

// POST /api/advance-stage
router.post('/advance-stage', async (_req, res) => {
  try {
    const current = await getGameState();
    const currentStage = current.gameStage as keyof typeof stageFlow;
    const nextStage = stageFlow[currentStage] || 'ACTION';

    const updated = await setGameStage(nextStage as any);

    res.status(200).json({
      message: `Advanced to ${updated.gameStage}`,
      gameStage: updated.gameStage,
    });
  } catch (e) {
    console.error('Error advancing game stage:', e);
    res.status(500).json({ error: 'Failed to advance stage' });
  }
});

export default router;
