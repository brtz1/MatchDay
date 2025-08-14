import express from 'express';
import { getEventsByMatchId, getEventsByMatchdayNumber } from '../services/matchEventService';

const router = express.Router();

/**
 * GET /api/match-events/:matchId
 */
router.get('/:matchId', async (req, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (Number.isNaN(matchId)) return res.status(400).json({ error: 'Invalid matchId' });
    const events = await getEventsByMatchId(matchId);
    res.json(events);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/match-events/by-matchday/:number
 * Returns EventsByMatch (grouped by saveGameMatchId)
 */
router.get('/by-matchday/:number', async (req, res, next) => {
  try {
    const number = Number(req.params.number);
    if (Number.isNaN(number)) return res.status(400).json({ error: 'Invalid matchday number' });
    const grouped = await getEventsByMatchdayNumber(number);
    res.json(grouped);
  } catch (e) {
    next(e);
  }
});

export default router;
