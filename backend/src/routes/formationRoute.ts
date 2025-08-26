import express from 'express';
import prisma from '../utils/prisma';
import { setCoachFormation } from '../services/matchService'; // 4-arg: (saveGameId, formation, lineupIds, reserveIds)

const router = express.Router();

/**
 * POST /api/matches/:matchId/formation
 * Body: { saveGameId: number, formation: string, lineupIds: number[], reserveIds?: number[] }
 *
 * Notes:
 * - This route now follows the "FE selects players" flow.
 * - `:matchId` is kept for URL stability; we don't rely on it to choose the coach match.
 * - Validation: exactly 11 starters and exactly 1 GK in lineupIds.
 */
router.post('/:matchId/formation', async (req, res, next) => {
  try {
    const matchId = Number(req.params.matchId); // not used to persist; kept for reference
    const { saveGameId, formation, lineupIds, reserveIds } = req.body as {
      saveGameId?: number;
      formation?: string;
      lineupIds?: number[];
      reserveIds?: number[];
    };

    if (!Number.isFinite(saveGameId ?? NaN)) {
      return res.status(400).json({ error: 'saveGameId (number) is required' });
    }
    if (typeof formation !== 'string' || !formation.trim()) {
      return res.status(400).json({ error: 'formation (string) is required' });
    }
    if (!Array.isArray(lineupIds) || lineupIds.length !== 11) {
      return res.status(400).json({ error: 'lineupIds must be an array of exactly 11 player IDs' });
    }
    const bench = Array.isArray(reserveIds) ? reserveIds : [];

    // Ensure exactly 1 GK in starters
    const starters = await prisma.saveGamePlayer.findMany({
      where: { id: { in: lineupIds } },
      select: { id: true, position: true },
    });
    if (starters.length !== 11) {
      return res.status(400).json({ error: 'Some starter IDs are invalid' });
    }
    const gkCount = starters.filter((p) => String(p.position).toUpperCase() === 'GK').length;
    if (gkCount !== 1) {
      return res.status(400).json({ error: 'Lineup must include exactly 1 GK' });
    }

    // Persist selection for the coach team’s upcoming match in this save
    await setCoachFormation(saveGameId!, formation, lineupIds, bench);

    return res.status(200).json({
      ok: true,
      message: 'Formation and selections recorded for upcoming match',
      meta: { matchIdHint: Number.isFinite(matchId) ? matchId : null },
    });
  } catch (error) {
    console.error('❌ Error setting formation:', error);
    next(error);
  }
});

export default router;
