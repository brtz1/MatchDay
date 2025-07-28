// backend/src/routes/matchdayRoute.ts

import express, { Request, Response, NextFunction } from 'express';
import {
  advanceMatchday,
  advanceMatchdayType,
  getMatchdayFixtures,
  getTeamMatchInfo,
} from '../services/matchdayService';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* POST /api/matchday/advance                                                */
/* Advance the current matchday: simulate matches, update tables              */
/* -------------------------------------------------------------------------- */
router.post('/advance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { saveGameId } = req.body;

    if (typeof saveGameId !== 'number' || isNaN(saveGameId)) {
      return res.status(400).json({ error: 'Missing or invalid saveGameId' });
    }

    const result = await advanceMatchday(saveGameId);
    res.status(200).json({ message: result });
  } catch (error) {
    console.error('❌ Failed to advance matchday:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/matchday/advance-type                                           */
/* Advances matchday number and toggles LEAGUE/CUP (no simulation)            */
/* -------------------------------------------------------------------------- */
router.post('/advance-type', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await advanceMatchdayType();
    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Failed to advance matchday type:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/matchday                                                         */
/* Optionally fetch fixtures for a given matchday number and type            */
/* -------------------------------------------------------------------------- */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const number = req.query.number ? parseInt(String(req.query.number)) : undefined;
    const type = req.query.type ? String(req.query.type).toUpperCase() : undefined;

    if (type && type !== 'LEAGUE' && type !== 'CUP') {
      return res.status(400).json({ error: 'Invalid matchday type. Use LEAGUE or CUP.' });
    }

    const fixtures = await getMatchdayFixtures(number, type as 'LEAGUE' | 'CUP' | undefined);
    res.status(200).json(fixtures);
  } catch (error) {
    console.error('❌ Error fetching matchday fixtures:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/matchday/team-match-info                                         */
/* Get matchId and home/away info for a team in a given matchday             */
/* -------------------------------------------------------------------------- */
router.get('/team-match-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = parseInt(String(req.query.saveGameId));
    const matchday = parseInt(String(req.query.matchday));
    const teamId = parseInt(String(req.query.teamId));

    if (isNaN(saveGameId) || isNaN(matchday) || isNaN(teamId)) {
      return res.status(400).json({ error: 'Missing or invalid query parameters' });
    }

    const result = await getTeamMatchInfo(saveGameId, matchday, teamId);

    if (!result || !result.matchId) {
      console.warn(`⚠️ No match found for team ${teamId} on matchday ${matchday}`);
      return res.status(404).json({ error: 'Match not found for this team and matchday' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error fetching team match info:', error);
    next(error);
  }
});

export default router;
