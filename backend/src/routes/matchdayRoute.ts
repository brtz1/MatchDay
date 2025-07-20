// backend/src/routes/matchdayRoute.ts

import express, { Request, Response, NextFunction } from 'express';
import * as matchdayService from '../services/matchdayService';

const router = express.Router();

/**
 * POST /api/matchdays/advance
 * Advances the current matchday: simulates all fixtures, updates results, league tables, and cup bracket.
 */
router.post('/advance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = await matchdayService.advanceMatchday();
    res.status(200).json({ message });
  } catch (error) {
    console.error('❌ Failed to advance matchday:', error);
    next(error);
  }
});

/**
 * POST /api/matchdays/advance-type
 * Advances just the matchday number and toggles matchday type (LEAGUE/CUP).
 * Does not simulate fixtures or update results.
 */
router.post('/advance-type', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await matchdayService.advanceMatchdayType();
    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Failed to advance matchday type:', error);
    next(error);
  }
});

/**
 * GET /api/matchdays
 * Optionally fetch fixtures or results for a given matchday number
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { number, type } = req.query;
    const matchdayNumber = number ? Number(number) : undefined;
    const matchdayType = type ? String(type) as any : undefined;

    const fixtures = await matchdayService.getMatchdayFixtures(matchdayNumber, matchdayType);
    res.status(200).json(fixtures);
  } catch (error) {
    console.error('❌ Error fetching matchday fixtures:', error);
    next(error);
  }
});

/**
 * GET /api/matchdays/team-match-info
 * Gets matchId and whether the team is home/away for a specific matchday.
 * Query params: saveGameId, matchday (number), teamId
 */
router.get('/team-match-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { saveGameId, matchday, teamId } = req.query;

    if (!saveGameId || !matchday || !teamId) {
      return res.status(400).json({ error: "Missing required query parameters" });
    }

    const result = await matchdayService.getTeamMatchInfo(
      Number(saveGameId),
      Number(matchday),
      Number(teamId)
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error in team-match-info:', error);
    next(error);
  }
});

export default router;
