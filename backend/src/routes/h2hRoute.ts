import { Router } from 'express';
import { getLastHeadToHeadText } from '../services/matchQueryService';

const router = Router();

/** GET /api/matches/h2h-last/:teamA/:teamB */
router.get('/h2h-last/:teamA/:teamB', async (req, res) => {
  try {
    const teamA = Number(req.params.teamA);
    const teamB = Number(req.params.teamB);
    if (Number.isNaN(teamA) || Number.isNaN(teamB)) {
      return res.status(400).json({ error: 'Invalid team IDs' });
    }

    const data = await getLastHeadToHeadText(teamA, teamB);
    return res.json(data);
  } catch (err: any) {
    console.error('[GET /matches/h2h-last/:teamA/:teamB] Error:', err);
    return res.status(500).json({ error: err?.message ?? 'Internal server error' });
  }
});

export default router;
