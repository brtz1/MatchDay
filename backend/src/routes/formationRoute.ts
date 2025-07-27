import { Router } from 'express';
import { setCoachFormation } from '../services/matchService';

const router = Router();

/**
 * POST /api/formation
 * Sets the formation and lineup for the coach's team for a given match.
 * Body: { matchId: number, teamId: number, formation: string, isHomeTeam: boolean }
 */
router.post('/', async (req, res) => {
  const { matchId, teamId, formation, isHomeTeam } = req.body;

  if (!matchId || !teamId || !formation || typeof isHomeTeam !== "boolean") {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    await setCoachFormation(matchId, teamId, formation, isHomeTeam);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error setting formation:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

export default router;
