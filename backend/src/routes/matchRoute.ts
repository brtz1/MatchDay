// backend/src/routes/matchRoute.ts

import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';
import {
  getMatchStateById,
  simulateMatchday,
  setCoachFormation,
} from '@/services/matchService';

const router = express.Router();

/**
 * GET /api/matches
 * Fetch all matches for the current save game.
 */
router.get('/', async (_req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

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
 * Fetch a single match by ID.
 */
router.get('/:matchId', async (req, res, next) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

    const match = await prisma.saveGameMatch.findFirst({
      where: { id: matchId, saveGameId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });

    res.status(200).json(match);
  } catch (error) {
    console.error(`❌ Error fetching match ${matchId}:`, error);
    next(error);
  }
});

/**
 * GET /api/matches/match-state/:matchId
 * Fetch match state (lineups, bench) for a match.
 */
router.get('/match-state/:matchId', async (req, res) => {
  const matchId = parseInt(req.params.matchId);
  const matchState = await getMatchStateById(matchId);
  if (!matchState) return res.status(404).json({ error: 'Not found' });
  res.json(matchState);
});

/**
 * POST /api/matches/:matchId/formation
 * Sets the coach team formation and selects lineup and bench automatically.
 */
router.post('/:matchId/formation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = Number(req.params.matchId);
    const { teamId, formation, isHomeTeam } = req.body;

    if (!matchId || !teamId || !formation || typeof isHomeTeam !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await setCoachFormation(matchId, teamId, formation, isHomeTeam);
    res.status(200).json({ message: 'Formation and lineup set' });
  } catch (error) {
    console.error('❌ Error setting formation:', error);
    next(error);
  }
});

/**
 * POST /api/matches/:matchId/simulate
 * Randomly simulates a single match (debug only).
 */
router.post('/:matchId/simulate', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

    const existing = await prisma.saveGameMatch.findFirst({ where: { id: matchId, saveGameId } });
    if (!existing) return res.status(404).json({ error: 'Match not found' });

    const homeGoals = Math.floor(Math.random() * 5);
    const awayGoals = Math.floor(Math.random() * 5);

    const updated = await prisma.saveGameMatch.update({
      where: { id: matchId },
      data: { homeGoals, awayGoals, played: true },
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
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

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
 */
router.delete('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    await prisma.saveGameMatch.delete({ where: { id: matchId } });
    res.status(200).json({ message: 'Match deleted' });
  } catch (error) {
    console.error(`❌ Error deleting match ${matchId}:`, error);
    next(error);
  }
});

/**
 * GET /api/matches/all
 * Fetch all matches with team names, ordered by matchday.
 */
router.get('/all', async (_req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    const matches = await prisma.saveGameMatch.findMany({
      where: { saveGameId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        matchday: { select: { number: true } },
      },
      orderBy: {
        matchday: {
          number: 'asc',
        },
      },
    });
    res.json(matches);
  } catch (error) {
    next(error);
  }
});

export default router;
