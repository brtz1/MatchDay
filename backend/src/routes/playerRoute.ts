import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = express.Router();

/**
 * GET /api/players
 * Fetch all players in the current save game.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      res.status(400).json({ error: 'No active save game found' });
      return;
    }

    const players = await prisma.saveGamePlayer.findMany({
      where: { saveGameId },
      include: { team: true },
    });
    res.status(200).json(players);
  } catch (error) {
    console.error('❌ Error fetching players:', error);
    next(error);
  }
});

/**
 * GET /api/players/:playerId
 * Fetch a single player by ID within the current save game.
 */
router.get('/:playerId', async (req: Request, res: Response, next: NextFunction) => {
  const playerId = Number(req.params.playerId);
  if (isNaN(playerId)) {
    res.status(400).json({ error: 'Invalid player ID' });
    return;
  }

  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      res.status(400).json({ error: 'No active save game found' });
      return;
    }

    const player = await prisma.saveGamePlayer.findFirst({
      where: { id: playerId, saveGameId },
      include: { team: true },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    res.status(200).json(player);
  } catch (error) {
    console.error(`❌ Error fetching player ${playerId}:`, error);
    next(error);
  }
});

/**
 * POST /api/players
 * Prohibit creating players via API.
 */
router.post('/', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Player creation is only allowed at game start.' });
});

export default router;
