// backend/src/routes/matchEventRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import { getEventsByMatchId, getEventsByMatchdayId } from '../services/matchEventService';

const router = Router();

/**
 * GET /api/match-events/:matchId
 * Fetches all events for a given match, ordered by minute.
 */
router.get('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) {
    return res.status(400).json({ error: 'Invalid match ID' });
  }

  try {
    const events = await getEventsByMatchId(matchId);
    res.status(200).json(events);
  } catch (error) {
    console.error(`❌ Error fetching events for match ${matchId}:`, error);
    next(error);
  }
});

/**
 * GET /api/match-events/by-matchday/:matchdayId
 * Fetches all events for all matches in a given matchday, grouped by matchId.
 */
router.get('/by-matchday/:matchdayId', async (req: Request, res: Response, next: NextFunction) => {
  const matchdayId = Number(req.params.matchdayId);
  if (isNaN(matchdayId)) {
    return res.status(400).json({ error: 'Invalid matchday ID' });
  }

  try {
    const eventsByMatch = await getEventsByMatchdayId(matchdayId);
    res.status(200).json(eventsByMatch);
  } catch (error) {
    console.error(`❌ Error fetching events for matchday ${matchdayId}:`, error);
    next(error);
  }
});

export default router;
