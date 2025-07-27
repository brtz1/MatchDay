import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getGameState } from '../services/gameState';
import {
  getMatchStateById,
  simulateMatchday,
  setCoachFormation,
} from '../services/matchService';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* GET: All Matches                                                           */
/* -------------------------------------------------------------------------- */
router.get('/', async (_req, res, next) => {
  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const matches = await prisma.saveGameMatch.findMany({
      where: { saveGameId: gameState.currentSaveGameId },
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

/* -------------------------------------------------------------------------- */
/* GET: Single Match by ID                                                    */
/* -------------------------------------------------------------------------- */
router.get('/:matchId', async (req, res, next) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const match = await prisma.saveGameMatch.findFirst({
      where: { id: matchId, saveGameId: gameState.currentSaveGameId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });

    res.status(200).json(match);
  } catch (error) {
    console.error(`❌ Error fetching match ${matchId}:`, error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* GET: Match State (Lineup + Bench)                                          */
/* -------------------------------------------------------------------------- */
router.get('/match-state/:matchId', async (req, res, next) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const match = await prisma.saveGameMatch.findFirst({
      where: { id: matchId, saveGameId: gameState.currentSaveGameId },
    });
    if (!match) return res.status(404).json({ error: 'Match not found in current save' });

    const matchState = await getMatchStateById(matchId);
    if (!matchState) return res.status(404).json({ error: 'Match state not found' });

    res.json(matchState);
  } catch (error) {
    console.error(`❌ Error fetching match state ${matchId}:`, error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* POST: Set Formation + Lineup for Coach's Team                              */
/* -------------------------------------------------------------------------- */
router.post('/:matchId/formation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = Number(req.params.matchId);
    const { teamId, formation, isHomeTeam } = req.body;

    if (!matchId || !teamId || !formation || typeof isHomeTeam !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const gameState = await getGameState();
    if (!gameState || gameState.coachTeamId !== teamId) {
      return res.status(403).json({ error: 'You can only modify your own team' });
    }

    const result = await setCoachFormation(matchId, teamId, formation, isHomeTeam);
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error setting formation:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* POST: Simulate Random Match (DEBUG only)                                   */
/* -------------------------------------------------------------------------- */
router.post('/:matchId/simulate', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const existing = await prisma.saveGameMatch.findFirst({
      where: { id: matchId, saveGameId: gameState.currentSaveGameId },
    });
    if (!existing) return res.status(404).json({ error: 'Match not found' });

    const homeGoals = Math.floor(Math.random() * 5);
    const awayGoals = Math.floor(Math.random() * 5);

    const updated = await prisma.saveGameMatch.update({
      where: { id: matchId },
      data: {
        homeGoals,
        awayGoals,
        played: true,
        matchDate: new Date(),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error(`❌ Error simulating match ${matchId}:`, error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* POST: Create New Match                                                     */
/* -------------------------------------------------------------------------- */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeTeamId, awayTeamId, matchDate, matchdayType = "LEAGUE" } = req.body;
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const newMatch = await prisma.saveGameMatch.create({
      data: {
        saveGameId: gameState.currentSaveGameId,
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        matchDate: new Date(matchDate),
        matchdayType,
      },
    });

    res.status(201).json(newMatch);
  } catch (error) {
    console.error('❌ Error creating match:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* DELETE: Match by ID                                                        */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* GET: All Matches with Team Names & Matchday Numbers                        */
/* -------------------------------------------------------------------------- */
router.get('/all', async (_req, res, next) => {
  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const matches = await prisma.saveGameMatch.findMany({
      where: { saveGameId: gameState.currentSaveGameId },
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
    console.error('❌ Error fetching all matches:', error);
    next(error);
  }
});

export default router;
