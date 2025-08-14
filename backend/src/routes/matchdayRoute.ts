import express, { Request, Response, NextFunction } from 'express';
import {
  startMatchday,
  completeMatchday,
  advanceMatchdayType,
  getMatchdayFixtures,
  getTeamMatchInfo,
} from '../services/matchdayService';
import {
  ensureGameState,
  setCurrentSaveGame,
  getGameState,
} from '../services/gameState';
import prisma from '../utils/prisma';
import { GameStage } from '@prisma/client';

const router = express.Router();

/**
 * POST /api/matchday/set-stage
 * Body: { saveGameId: number, stage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS" }
 * Robustly flips the *active* save game's stage.
 */
router.post(
  '/set-stage',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { saveGameId, stage } = req.body ?? {};
      if (typeof saveGameId !== 'number' || Number.isNaN(saveGameId)) {
        return res.status(400).json({ error: 'saveGameId (number) is required' });
      }
      if (!Object.values(GameStage).includes(stage)) {
        return res.status(400).json({ error: 'Invalid stage value' });
      }

      await ensureGameState({ saveGameId });
      await setCurrentSaveGame(saveGameId);

      // 🔧 Target the row by currentSaveGameId to avoid id mismatches
      const updated = await prisma.gameState.updateMany({
        where: { currentSaveGameId: saveGameId },
        data: { gameStage: stage },
      });

      if (updated.count === 0) {
        return res.status(404).json({ error: 'Active GameState not found for saveGameId' });
      }

      const gs = await getGameState();
      return res.status(200).json({ gameStage: gs?.gameStage });
    } catch (error) {
      console.error('❌ Failed to set stage:', error);
      next(error);
    }
  }
);

/**
 * POST /api/matchday/advance
 * Flip into MATCHDAY & start the async simulation that will pause at 45'.
 */
router.post('/advance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { saveGameId } = req.body ?? {};
    if (typeof saveGameId !== 'number' || Number.isNaN(saveGameId)) {
      return res.status(400).json({ error: 'Missing or invalid saveGameId' });
    }

    const midState = await startMatchday(saveGameId);
    res.status(200).json(midState);

    completeMatchday(saveGameId).catch(err =>
      console.error('Error completing matchday:', err)
    );
  } catch (error) {
    console.error('❌ Failed to advance matchday:', error);
    next(error);
  }
});

/**
 * POST /api/matchday/advance-type
 */
router.post('/advance-type', async (_req, res, next) => {
  try {
    const updated = await advanceMatchdayType();
    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Failed to advance matchday type:', error);
    next(error);
  }
});

/**
 * GET /api/matchday
 */
router.get('/', async (req, res, next) => {
  try {
    const num = req.query.number ? parseInt(String(req.query.number), 10) : undefined;
    const typeParam = req.query.type ? String(req.query.type).toUpperCase() : undefined;
    if (typeParam && typeParam !== 'LEAGUE' && typeParam !== 'CUP') {
      return res.status(400).json({ error: 'Invalid matchday type. Use LEAGUE or CUP.' });
    }

    const fixtures = await getMatchdayFixtures(num, typeParam as any);
    res.status(200).json(fixtures);
  } catch (error) {
    console.error('❌ Error fetching matchday fixtures:', error);
    next(error);
  }
});

/**
 * GET /api/matchday/team-match-info
 */
router.get('/team-match-info', async (req, res, next) => {
  try {
    const saveGameId = parseInt(String(req.query.saveGameId), 10);
    const matchday = parseInt(String(req.query.matchday), 10);
    const teamId = parseInt(String(req.query.teamId), 10);

    if (Number.isNaN(saveGameId) || Number.isNaN(matchday) || Number.isNaN(teamId)) {
      return res.status(400).json({ error: 'Missing or invalid query parameters' });
    }

    const info = await getTeamMatchInfo(saveGameId, matchday, teamId);
    res.status(200).json(info);
  } catch (error) {
    console.error('❌ Error fetching team match info:', error);
    next(error);
  }
});

export default router;
