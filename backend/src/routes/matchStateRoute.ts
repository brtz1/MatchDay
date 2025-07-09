// src/routes/matchStateRoute.ts

import express, { Request, Response } from 'express';
import {
  getMatchLineup,
  submitSubstitution,
  resumeMatch,
} from '../services/substitutionService';

const router = express.Router();

// GET /api/match-state/:matchId
router.get('/match-state/:matchId', async (req: Request, res: Response) => {
  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) return res.status(400).json({ error: 'Invalid match ID' });

  try {
    const lineup = await getMatchLineup(matchId);
    res.json(lineup);
  } catch (e) {
    console.error('Lineup error:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/substitute
router.post('/substitute', async (req: Request, res: Response) => {
  const { matchId, team, outPlayerId, inPlayerId } = req.body;

  if (!matchId || !team || !outPlayerId || !inPlayerId) {
    return res.status(400).json({ error: 'Missing substitution parameters' });
  }

  try {
    await submitSubstitution(matchId, team, outPlayerId, inPlayerId);
    res.json({ message: 'Substitution successful' });
  } catch (e) {
    console.error('Substitution error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
});

// POST /api/resume-match
router.post('/resume-match', async (req: Request, res: Response) => {
  const { matchId } = req.body;
  if (!matchId) return res.status(400).json({ error: 'Missing match ID' });

  try {
    await resumeMatch(matchId);
    res.json({ message: 'Match resumed' });
  } catch (e) {
    console.error('Resume error:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
