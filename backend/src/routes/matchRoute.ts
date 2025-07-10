import { Router } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * Get all matches in current save game
 */
router.get('/', async (_req, res) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    const matches = await prisma.saveGameMatch.findMany({
      where: { saveGameId },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });
    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/**
 * Get a single match by ID from current save game
 */
router.get('/:matchId', async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const match = await prisma.saveGameMatch.findFirst({
      where: {
        id: matchId,
        saveGameId,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

/**
 * Simulate a match (basic example)
 */
router.post('/:matchId/simulate', async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const match = await prisma.saveGameMatch.findFirst({
      where: {
        id: matchId,
        saveGameId,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });

    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = Math.floor(Math.random() * 4);

    const updated = await prisma.saveGameMatch.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        played: true, // ✅ updated field
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to simulate match' });
  }
});

/**
 * Create a new match in current save game
 */
router.post('/', async (req, res) => {
  const {
    homeTeamId,
    awayTeamId,
    matchDate,
  } = req.body;

  try {
    const saveGameId = await getCurrentSaveGameId();
    const newMatch = await prisma.saveGameMatch.create({
      data: {
        saveGameId,
        homeTeamId,
        awayTeamId,
        matchDate: new Date(matchDate),
      },
    });
    res.status(201).json(newMatch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

/**
 * Delete a match
 */
router.delete('/:matchId', async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    await prisma.saveGameMatch.delete({
      where: { id: matchId },
    });
    res.json({ message: 'Match deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

export default router;
