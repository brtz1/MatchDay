// backend/src/routes/matchdayRoute.ts

import express, { Request, Response, NextFunction } from 'express';
import {
  startMatchday,
  completeMatchday,
  advanceMatchdayType,
  getMatchdayFixtures,
  getTeamMatchInfo,
} from '../services/matchdayService';
import { getGameState } from '../services/gameState';

const router = express.Router();

/**
 * POST /api/matchday/advance
 * 1) Flip into MATCHDAY & return the mid-state immediately.
 * 2) Then run simulation & post-match updates in background.
 */
router.post(
  '/advance',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { saveGameId } = req.body;
      if (typeof saveGameId !== 'number' || isNaN(saveGameId)) {
        return res
          .status(400)
          .json({ error: 'Missing or invalid saveGameId' });
      }

      // 1) flip to MATCHDAY
      const midState = await startMatchday(saveGameId);
      res.status(200).json(midState);

      // 2) background completion
      completeMatchday(saveGameId).catch((err) =>
        console.error('Error completing matchday:', err)
      );
    } catch (error) {
      console.error('❌ Failed to advance matchday:', error);
      next(error);
    }
  }
);

/**
 * POST /api/matchday/advance-type
 * Just bump the matchday number/type (no simulation).
 */
router.post(
  '/advance-type',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await advanceMatchdayType();
      res.status(200).json(updated);
    } catch (error) {
      console.error('❌ Failed to advance matchday type:', error);
      next(error);
    }
  }
);

/**
 * GET /api/matchday
 * Fetch fixtures for a specific or current matchday.
 */
router.get('/', async (req, res, next) => {
  try {
    const num = req.query.number
      ? parseInt(String(req.query.number), 10)
      : undefined;
    const type = req.query.type
      ? String(req.query.type).toUpperCase()
      : undefined;

    if (type && type !== 'LEAGUE' && type !== 'CUP') {
      return res
        .status(400)
        .json({ error: 'Invalid matchday type. Use LEAGUE or CUP.' });
    }

    const fixtures = await getMatchdayFixtures(
      num,
      type as 'LEAGUE' | 'CUP' | undefined
    );
    res.status(200).json(fixtures);
  } catch (error) {
    console.error('❌ Error fetching matchday fixtures:', error);
    next(error);
  }
});

/**
 * GET /api/matchday/team-match-info
 * Which match does a team play on a given matchday?
 */
router.get(
  '/team-match-info',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = parseInt(String(req.query.saveGameId), 10);
      const matchday = parseInt(String(req.query.matchday), 10);
      const teamId = parseInt(String(req.query.teamId), 10);

      if (
        isNaN(saveGameId) ||
        isNaN(matchday) ||
        isNaN(teamId)
      ) {
        return res
          .status(400)
          .json({ error: 'Missing or invalid query parameters' });
      }

      const info = await getTeamMatchInfo(
        saveGameId,
        matchday,
        teamId
      );
      res.status(200).json(info);
    } catch (error) {
      console.error('❌ Error fetching team match info:', error);
      next(error);
    }
  }
);

export default router;
