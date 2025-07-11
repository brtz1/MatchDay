// src/routes/summaryRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * GET /api/summary/:matchdayId
 * Returns a summary of all matches for a given matchday:
 *  - home/away team info and scores
 *  - ordered match events
 *  - per-player stats for each match
 */
router.get(
  '/:matchdayId',
  async (req: Request, res: Response, next: NextFunction) => {
    const matchdayId = Number(req.params.matchdayId);
    if (isNaN(matchdayId)) {
      res.status(400).json({ error: 'Invalid matchday ID' });
      return;
    }

    try {
      const matches = await prisma.match.findMany({
        where: { matchdayId },
        include: {
          homeTeam: true,
          awayTeam: true,
          events: { orderBy: { minute: 'asc' } },
          playerStats: { include: { player: true } },
        },
      });

      const summary = matches.map((m) => ({
        matchId: m.id,
        home: {
          id: m.homeTeamId,
          name: m.homeTeam.name,
          score: m.homeScore ?? 0,
        },
        away: {
          id: m.awayTeamId,
          name: m.awayTeam.name,
          score: m.awayScore ?? 0,
        },
        events: m.events.map((e) => ({
          minute: e.minute,
          type: e.eventType,
          description: e.description,
        })),
        stats: m.playerStats.map((s) => ({
          playerId: s.playerId,
          name: s.player.name,
          position: s.player.position,
          goals: s.goals,
          assists: s.assists,
          yellow: s.yellow,
          red: s.red,
        })),
      }));

      res.status(200).json(summary);
    } catch (error) {
      console.error('❌ Error generating summary:', error);
      next(error);
    }
  }
);

export default router;
