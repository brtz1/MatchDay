import express from 'express';
import prisma from '../utils/prisma';

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
router.post('/advance-stage', async (req, res) => {
  try {
    const current = await prisma.gameState.findFirst();

    if (!current) {
      return res.status(404).json({ error: 'No GameState found' });
    }

    const currentStage = current.gameStage as keyof typeof stageFlow;
    const nextStage = stageFlow[currentStage] || 'ACTION';

    const updated = await prisma.gameState.update({
      where: { id: current.id },
      data: { gameStage: nextStage },
    });

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
