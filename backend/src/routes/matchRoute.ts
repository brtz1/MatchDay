import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = express.Router();

/**
 * GET /api/matches
 * Fetch all matches for the current save game.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      res.status(400).json({ error: 'No active save game found' });
      return;
    }

    const matches = await prisma.saveGameMatch.findMany({
      where: { saveGameId },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    res.status(200).json(matches);
  } catch (error) {
    console.error('❌ Error fetching matches:', error);
    next(error);
  }
});

/**
 * GET /api/matches/:matchId
 * Fetch a single match by ID within the current save game.
 */
router.get('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) {
    res.status(400).json({ error: 'Invalid match ID' });
    return;
  }

  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      res.status(400).json({ error: 'No active save game found' });
      return;
    }

    const match = await prisma.saveGameMatch.findFirst({
      where: { id: matchId, saveGameId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    res.status(200).json(match);
  } catch (error) {
    console.error(`❌ Error fetching match ${matchId}:`, error);
    next(error);
  }
});

/**
 * POST /api/matches/:matchId/simulate
 * Simulate an existing match with random score and mark as played.
 */
router.post('/:matchId/simulate', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) {
    res.status(400).json({ error: 'Invalid match ID' });
    return;
  }

  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      res.status(400).json({ error: 'No active save game found' });
      return;
    }

    const existing = await prisma.saveGameMatch.findFirst({
      where: { id: matchId, saveGameId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const homeGoals = Math.floor(Math.random() * 5);
    const awayGoals = Math.floor(Math.random() * 5);

    const updated = await prisma.saveGameMatch.update({
      where: { id: matchId },
      data: { homeGoals, awayGoals, played: true }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error(`❌ Error simulating match ${matchId}:`, error);
    next(error);
  }
});

/**
 * POST /api/matches
 * Create a new match under the current save game.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeTeamId, awayTeamId, matchDate } = req.body;
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      res.status(400).json({ error: 'No active save game found' });
      return;
    }

    const newMatch = await prisma.saveGameMatch.create({
      data: {
        saveGameId,
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        matchDate: new Date(matchDate),
      },
    });

    res.status(201).json(newMatch);
  } catch (error) {
    console.error('❌ Error creating match:', error);
    next(error);
  }
});

/**
 * DELETE /api/matches/:matchId
 * Delete a match by ID.
 */
router.delete('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) {
    res.status(400).json({ error: 'Invalid match ID' });
    return;
  }

  try {
    await prisma.saveGameMatch.delete({ where: { id: matchId } });
    res.status(200).json({ message: 'Match deleted' });
  } catch (error) {
    console.error(`❌ Error deleting match ${matchId}:`, error);
    next(error);
  }
});

// GET /api/matches/all
router.get('/all', async (_req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    const matches = await prisma.saveGameMatch.findMany({
      where: { saveGameId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: {
  matchday: {
    number: 'asc' // or use appropriate sortable field in matchday
  }
},
    });
    res.json(matches);
  } catch (error) {
    next(error);
  }
});

export default router;
