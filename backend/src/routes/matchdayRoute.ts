// backend/src/routes/matchdayRoute.ts

import express, { Request, Response, NextFunction } from 'express';
import * as matchdayService from '../services/matchdayService';

const router = express.Router();

/**
 * POST /api/matchdays/advance
 * Advances the current matchday for the given save game ID:
 * - Simulates fixtures
 * - Updates matchday records
 * - Updates standings or cup bracket
 */
router.post('/advance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { saveGameId } = req.body;

    if (typeof saveGameId !== 'number' || isNaN(saveGameId)) {
      return res.status(400).json({ error: 'Missing or invalid saveGameId' });
    }

    const message = await matchdayService.advanceMatchday(saveGameId);
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
    const matchdayType = type ? String(type).toUpperCase() as 'LEAGUE' | 'CUP' : undefined;

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
    const saveGameId = parseInt(String(req.query.saveGameId));
    const matchday = parseInt(String(req.query.matchday));
    const teamId = parseInt(String(req.query.teamId));

    if (isNaN(saveGameId) || isNaN(matchday) || isNaN(teamId)) {
      return res.status(400).json({ error: "Missing or invalid query parameters" });
    }

    const result = await matchdayService.getTeamMatchInfo(saveGameId, matchday, teamId);

    if (!result?.matchId) {
      console.warn(`⚠️ No match found for team ${teamId} on matchday ${matchday}`);
      return res.status(404).json({ error: 'Match not found for this team and matchday' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error in team-match-info:', error);
    next(error);
  }
});

export default router;
