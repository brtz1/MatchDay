import { Router } from 'express';
// ✅ use relative path to avoid alias resolution issues at runtime
import { getNextMatchForTeam } from '../services/matchQueryService';

const router = Router();

/**
 * GET /api/matches/next/:teamId
 * Returns MatchLiteDTO (or null) for the given teamId based on current GameState.
 */
router.get('/next/:teamId', async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid teamId' });
    }

    const data = await getNextMatchForTeam(teamId);
    return res.json(data);
  } catch (err: any) {
    console.error('[GET /matches/next/:teamId] Error:', err);
    return res.status(500).json({ error: err?.message ?? 'Internal server error' });
  }
});

export default router;
