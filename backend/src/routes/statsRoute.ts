// backend/src/routes/statsRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * GET /api/stats/player/:playerId
 * Per-match rows for a SaveGamePlayer (kept for detailed views / tables).
 * Includes season via the matchday relation.
 */
router.get(
  '/player/:playerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const playerId = Number(req.params.playerId);
      if (!Number.isFinite(playerId)) {
        return res.status(400).json({ error: 'Invalid player id' });
      }

      const rows = await prisma.saveGamePlayerMatchStats.findMany({
        where: { saveGamePlayerId: playerId },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          saveGameMatchId: true,
          goals: true,
          assists: true,
          yellow: true,
          red: true,
          injuries: true,
          saveGameMatch: {
            select: { matchday: { select: { season: true } } },
          },
        },
      });

      const result = rows.map(r => ({
        id: r.id,
        matchId: r.saveGameMatchId,
        goals: r.goals ?? 0,
        assists: r.assists ?? 0,
        yellow: r.yellow ?? 0,
        red: r.red ?? 0,
        injuries: r.injuries ?? 0,
        season: r.saveGameMatch?.matchday?.season ?? 1,
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ Error loading per-match stats for player:', error);
      next(error);
    }
  }
);

/**
 * GET /api/stats/player/:playerId/summary
 * Career totals + "goals this season" using MatchEvent (GOAL / RED / INJURY).
 * Games played still comes from SaveGamePlayerMatchStats (appearance rows).
 */
router.get(
  '/player/:playerId/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const playerId = Number(req.params.playerId);
      if (!Number.isFinite(playerId)) {
        return res.status(400).json({ error: 'Invalid player id' });
      }

      // Current season from GameState
      const gs = await prisma.gameState.findUnique({
        where: { id: 1 },
        select: { season: true },
      });
      const currentSeason = gs?.season ?? 1;

      // Games played = number of appearance rows
      const gamesPlayed = await prisma.saveGamePlayerMatchStats.count({
        where: { saveGamePlayerId: playerId },
      });

      // Tally events
      const [goals, redCards, injuries, goalsThisSeason] = await Promise.all([
        prisma.matchEvent.count({
          where: { saveGamePlayerId: playerId, type: 'GOAL' },
        }),
        prisma.matchEvent.count({
          where: { saveGamePlayerId: playerId, type: 'RED' },
        }),
        prisma.matchEvent.count({
          where: { saveGamePlayerId: playerId, type: 'INJURY' },
        }),
        prisma.matchEvent.count({
          where: {
            saveGamePlayerId: playerId,
            type: 'GOAL',
            // Filter by the match's matchday.season
            saveGameMatch: { matchday: { season: currentSeason } },
          },
        }),
      ]);

      res.status(200).json({
        gamesPlayed,
        goals,
        goalsThisSeason,
        redCards,
        injuries,
        season: currentSeason,
      });
    } catch (error) {
      console.error('❌ Error loading stats summary for player:', error);
      next(error);
    }
  }
);

/**
 * Optional: keep a lightweight aggregate endpoint if something else uses it.
 * (Now targets *save-game* stats, not base tables.)
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await prisma.saveGamePlayerMatchStats.findMany({
        select: {
          saveGamePlayerId: true,
          goals: true,
          assists: true,
          yellow: true,
          red: true,
          injuries: true,
        },
      });
      res.status(200).json(stats);
    } catch (error) {
      console.error('❌ Error loading global stats:', error);
      next(error);
    }
  }
);

export default router;
