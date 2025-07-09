import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * Get all matches
 */
router.get('/', async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
        matchday: true,
      },
    });
    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/**
 * Get a single match by id
 */
router.get('/:matchId', async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match id' });

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
        matchday: true,
        events: true,
        playerStats: true,
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
 * Simulate a match (simple version)
 */
router.post('/:matchId/simulate', async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match id' });

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });

    // simplistic simulation
    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = Math.floor(Math.random() * 4);

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        isPlayed: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to simulate match' });
  }
});

/**
 * Create a new match
 */
router.post('/', async (req, res) => {
  const {
    homeTeamId,
    awayTeamId,
    matchDate,
    season,
    matchdayId,
    refereeId
  } = req.body;

  try {
    const newMatch = await prisma.match.create({
      data: {
        homeTeamId,
        awayTeamId,
        matchDate: new Date(matchDate),
        season,
        matchdayId,
        refereeId,
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
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match id' });

  try {
    await prisma.match.delete({
      where: { id: matchId },
    });
    res.json({ message: 'Match deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

export default router;
