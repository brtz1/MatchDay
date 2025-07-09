// src/routes/gameStateRoute.ts
import express from 'express';
import prisma from '../utils/prisma';
import { GameState } from '../state/gameState';

const router = express.Router();

// GET /api/gamestate
router.get('/', async (req, res) => {
  try {
    const gameState = await prisma.gameState.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!gameState) {
      return res.status(404).json({ error: 'No active game state found' });
    }

    res.json(gameState);
  } catch (err: any) {
    console.error('Failed to fetch game state:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gamestate/advance-stage
router.post('/advance-stage', async (req, res) => {
  try {
    const updated = await GameState.advanceStage();
    res.json({ message: `Advanced to ${updated.gameStage}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to advance stage' });
  }
});

export default router;
