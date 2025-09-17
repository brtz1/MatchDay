import { Router } from 'express';
import { backfillStatsForSave, syncStatsForMatchday, syncStatsForMatch } from '../services/statsSyncFromEvents';

const router = Router();

router.post('/sync/matchday/:matchdayId', async (req, res, next) => {
  try {
    const matchdayId = Number(req.params.matchdayId);
    await syncStatsForMatchday(matchdayId);
    res.json({ ok: true, matchdayId });
  } catch (e) { next(e); }
});

router.post('/sync/match/:matchId', async (req, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    await syncStatsForMatch(matchId);
    res.json({ ok: true, matchId });
  } catch (e) { next(e); }
});

router.post('/backfill/save/:saveGameId', async (req, res, next) => {
  try {
    const saveGameId = Number(req.params.saveGameId);
    await backfillStatsForSave(saveGameId);
    res.json({ ok: true, saveGameId });
  } catch (e) { next(e); }
});

export default router;
