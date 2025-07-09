import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Get all players
 */
router.get('/', async (_req, res) => {
  try {
    const players = await prisma.player.findMany({
      include: {
        team: true,
      },
    });
    res.json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * Get a single player by ID
 */
router.get('/:playerId', async (req, res) => {
  const playerId = parseInt(req.params.playerId);
  if (isNaN(playerId)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true, matchStats: true },
    });
    if (!player) return res.status(404).json({ error: 'Player not found' });
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

/**
 * Update limited player fields
 */
router.put('/:playerId', async (req, res) => {
  const playerId = parseInt(req.params.playerId);
  if (isNaN(playerId)) return res.status(400).json({ error: 'Invalid player id' });

  const { rating, teamId, contractUntil } = req.body;

  try {
    const updated = await prisma.player.update({
      where: { id: playerId },
      data: {
        rating,
        teamId,
        contractUntil,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

/**
 * Prohibit player deletion
 */
router.delete('/:playerId', async (_req, res) => {
  res.status(403).json({ error: 'Players cannot be deleted.' });
});

export default router;
