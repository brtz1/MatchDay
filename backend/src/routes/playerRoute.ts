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
 * Get a single player by id
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
 * Create a new player
 */
router.post('/', async (req, res) => {
  const { name, nationality, position, rating, salary, teamId } = req.body;

  try {
    const newPlayer = await prisma.player.create({
      data: {
        name,
        nationality,
        position,
        rating,
        salary,
        teamId,
      },
    });
    res.status(201).json(newPlayer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

/**
 * Update a player
 */
router.put('/:playerId', async (req, res) => {
  const playerId = parseInt(req.params.playerId);
  if (isNaN(playerId)) return res.status(400).json({ error: 'Invalid player id' });

  const { name, nationality, position, rating, salary, teamId } = req.body;

  try {
    const updated = await prisma.player.update({
      where: { id: playerId },
      data: {
        name,
        nationality,
        position,
        rating,
        salary,
        teamId,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

/**
 * Delete a player
 */
router.delete('/:playerId', async (req, res) => {
  const playerId = parseInt(req.params.playerId);
  if (isNaN(playerId)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    await prisma.player.delete({
      where: { id: playerId },
    });
    res.json({ message: 'Player deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;
