// src/routes/matchSummaryRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * GET /api/match-summary/:matchdayId
 * Returns a summary of all matches in the given matchday for the current save game.
 */
router.get(
  '/:matchdayId',
  async (req: Request, res: Response, next: NextFunction) => {
    const matchdayId = Number(req.params.matchdayId);
    if (isNaN(matchdayId)) {
      res.status(400).json({ error: 'Invalid matchdayId' });
      return;
    }

    try {
      const saveGameId = await getCurrentSaveGameId();
      // Throws if no active save game

      const matches = await prisma.saveGameMatch.findMany({
        where: { saveGameId, matchdayId },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          MatchEvent: {
            orderBy: { minute: 'asc' },
            select: {
              minute: true,
              eventType: true,
              description: true,
              playerId: true,
            },
          },
        },
      });

      const summary = matches.map((m) => ({
        matchId: m.id,
        home: m.homeTeam.name,
        away: m.awayTeam.name,
        score: `${m.homeGoals ?? 0} - ${m.awayGoals ?? 0}`,
        events: m.MatchEvent.map((e) => ({
          minute: e.minute,
          type: e.eventType,
          description: e.description,
          playerId: e.playerId ?? undefined,
        })),
      }));

      res.status(200).json(summary);
    } catch (error) {
      console.error('❌ Error fetching match summary:', error);
      next(error);
    }
  }
);

export default router;
