// src/routes/matchdayRoute.ts

import express from 'express';
import { advanceMatchday } from '../services/matchdayService';

const router = express.Router();

router.post('/advance-matchday', async (req, res) => {
  try {
    const message = await advanceMatchday();
    res.status(200).json({ message });
  } catch (e) {
    console.error('Matchday advance failed:', e);
    res.status(500).json({ error: 'Failed to advance matchday' });
  }
});

export default router;
