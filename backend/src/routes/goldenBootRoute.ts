// backend/src/routes/goldenBootRoute.ts
import { Router, Request, Response } from 'express';
import { getSeasonGoldenBoot, getGoldenBootHistory } from '../services/goldenBootService';

const router = Router();

/**
 * GET /api/golden-boot/season
 * Query: saveGameId (req), season (opt), scope=all|league|cup (opt), limit (opt)
 */
router.get('/season', async (req: Request, res: Response) => {
  try {
    const saveGameId = Number(req.query.saveGameId);
    if (!saveGameId || Number.isNaN(saveGameId)) {
      return res.status(400).json({ error: 'saveGameId is required and must be a number' });
    }

    const season = req.query.season ? Number(req.query.season) : undefined;
    const scope = (req.query.scope as 'all' | 'league' | 'cup') || 'all';
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const top = await getSeasonGoldenBoot(saveGameId, season, scope, limit);
    return res.json({
      saveGameId,
      season: season ?? null,
      scope,
      top,
    });
  } catch (err) {
    console.error('GET /golden-boot/season error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/golden-boot/history
 * Query: saveGameId (req), scope=all|league|cup (opt), limit (opt)
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const saveGameId = Number(req.query.saveGameId);
    if (!saveGameId || Number.isNaN(saveGameId)) {
      return res.status(400).json({ error: 'saveGameId is required and must be a number' });
    }

    const scope = (req.query.scope as 'all' | 'league' | 'cup') || 'all';
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const top = await getGoldenBootHistory(saveGameId, scope, limit);
    return res.json({
      saveGameId,
      scope,
      top,
    });
  } catch (err) {
    console.error('GET /golden-boot/history error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
