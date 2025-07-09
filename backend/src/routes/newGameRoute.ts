// src/routes/newGameRoute.ts

import express from 'express';
import { startNewGame } from '../services/newGameService';

const router = express.Router();

router.post('/new-game', async (req, res) => {
  try {
    const { countries } = req.body;

    if (!Array.isArray(countries) || countries.length === 0) {
      return res.status(400).json({ error: 'You must provide a list of countries' });
    }

    const gameState = await startNewGame(countries);
    res.status(200).json(gameState);
  } catch (err) {
    console.error('Error starting new game:', err);
    res.status(500).json({ error: 'Failed to start new game' });
  }
});

export default router;
