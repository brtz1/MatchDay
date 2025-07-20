// backend/src/routes/matchStateRoute.ts

import express, { Request, Response, NextFunction } from 'express';
import { getMatchStateById, applySubstitution } from '@/services/matchService';

const router = express.Router();

/**
 * GET /api/matchstate/:matchId
 * Fetch match state (lineup, bench, subs made) for a match.
 */
router.get('/:matchId', async (req, res, next) => {
  const matchId = Number(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid matchId' });
  try {
    const state = await getMatchStateById(matchId);
    if (!state) return res.status(404).json({ error: 'MatchState not found' });
    res.json(state);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/matchstate/:matchId/substitute
 * Body: { out: number, in: number, isHomeTeam: boolean }
 */
router.post('/:matchId/substitute', async (req: Request, res: Response, next: NextFunction) => {
  const matchId = Number(req.params.matchId);
  const { out, in: inId, isHomeTeam } = req.body;
  if (
    isNaN(matchId) ||
    typeof out !== 'number' ||
    typeof inId !== 'number' ||
    typeof isHomeTeam !== 'boolean'
  ) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  try {
    await applySubstitution(matchId, out, inId, isHomeTeam);
    const updated = await getMatchStateById(matchId);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
