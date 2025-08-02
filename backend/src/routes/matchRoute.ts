import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId, getGameState } from '../services/gameState';
import {
  getMatchStateById,
  simulateMatchday,
  setCoachFormation,
  applySubstitution
} from '../services/matchService';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* GET: All Matches                                                           */
/* -------------------------------------------------------------------------- */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
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

/* -------------------------------------------------------------------------- */
/* GET: Single Match by ID                                                    */
/* -------------------------------------------------------------------------- */
router.get('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid matchId' });

    const match = await prisma.saveGameMatch.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true, MatchEvent: true },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.status(200).json(match);
  } catch (error) {
    console.error('❌ Error fetching match:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/matches/:matchId/formation                                        */
/* Confirm coach's formation, lineup, and bench                                */
/* -------------------------------------------------------------------------- */
router.post('/:matchId/formation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    const { formation, isHomeTeam } = req.body;

    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid matchId parameter' });
    }
    if (typeof formation !== 'string' || typeof isHomeTeam !== 'boolean') {
      return res.status(400).json({ error: 'Body must include formation (string) and isHomeTeam (boolean)' });
    }

    const result = await setCoachFormation(matchId, formation, isHomeTeam);
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error setting formation:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/matches/:matchId/substitution                                     */
/* Apply a substitution                                                         */
/* -------------------------------------------------------------------------- */
router.post('/:matchId/substitution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    const { outId, inId, isHomeTeam } = req.body;

    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid matchId parameter' });
    }
    if (typeof outId !== 'number' || typeof inId !== 'number' || typeof isHomeTeam !== 'boolean') {
      return res.status(400).json({ error: 'Body must include outId (number), inId (number), and isHomeTeam (boolean)' });
    }

    await applySubstitution(matchId, outId, inId, isHomeTeam);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error applying substitution:', error);
    next(error);
  }
});

export default router;
