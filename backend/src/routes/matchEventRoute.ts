// backend/src/routes/matchEventRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import { getEventsByMatchId } from '@/services/matchEventService';

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

export default router;
