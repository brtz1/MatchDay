import express, { Request, Response, NextFunction } from 'express';
import { startNewGame } from '../services/newGameService';

const router = express.Router();

/**
 * POST /api/new-game
 * Body: { countries: string[] }
 * Starts a completely new game by selecting clubs from the provided countries,
 * assigning them to divisions, and initializing GameState.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { countries } = req.body;
    if (!Array.isArray(countries) || countries.length === 0) {
      res.status(400).json({ error: 'You must provide a non-empty list of countries' });
      return;
    }

    const gameState = await startNewGame(countries.map(String));
    res.status(201).json(gameState);
  } catch (error) {
    console.error('❌ Error starting new game:', error);
    next(error);
  }
});

/**
 * GET /api/new-game/health
 * Health check for the new-game endpoint.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'New game endpoint is up' });
});

export default router;
