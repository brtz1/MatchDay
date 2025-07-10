// src/routes/playerRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * Get all players in the current save game
 */
router.get('/', async (_req, res) => {
  try {
    const currentSaveGameId = await getCurrentSaveGameId();
    const players = await prisma.saveGamePlayer.findMany({
      where: {
        saveGameId: currentSaveGameId,
      },
    });
    res.json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * Get a single player by ID in the current save game
 */
router.get('/:playerId', async (req, res) => {
  const playerId = parseInt(req.params.playerId);
  if (isNaN(playerId)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  try {
    const currentSaveGameId = await getCurrentSaveGameId();
    const player = await prisma.saveGamePlayer.findFirst({
      where: {
        id: playerId,
        saveGameId: currentSaveGameId,
      },
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

/**
 * Prohibit creating players via API
 */
router.post('/', async (_req, res) => {
  res.status(403).json({ error: 'Player creation is only allowed at game start.' });
});

export default router;
