import express from 'express';
import { setCoachFormation } from '../services/matchService';

const router = express.Router();

/**
 * POST /api/matches/:matchId/formation
 * Body: { formation: string, isHomeTeam: boolean }
 */
router.post('/:matchId/formation', async (req, res, next) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    const { formation, isHomeTeam } = req.body;

    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid matchId' });
    }
    if (typeof formation !== 'string' || typeof isHomeTeam !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'Request body must include formation (string) and isHomeTeam (boolean)' });
    }

    const result = await setCoachFormation(matchId, formation, isHomeTeam);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error setting formation:', error);
    next(error);
  }
});

export default router;
