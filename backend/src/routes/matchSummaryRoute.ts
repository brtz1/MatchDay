// backend/src/routes/matchSummaryRoute.ts

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
      return res.status(400).json({ error: 'Invalid matchdayId' });
    }

    try {
      const saveGameId = await getCurrentSaveGameId();
      if (!saveGameId) {
        return res.status(400).json({ error: 'No active save game found' });
      }

      // 1) Fetch matches with team names
      const matches = await prisma.saveGameMatch.findMany({
        where: { saveGameId, matchdayId },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      });

      // 2) Fetch events separately (schema uses saveGameMatchId and 'type')
      const matchIds = matches.map((m) => m.id);
      const events = await prisma.matchEvent.findMany({
        where: { saveGameMatchId: { in: matchIds } },
        orderBy: { minute: 'asc' },
        select: {
          saveGameMatchId: true,
          minute: true,
          type: true,
          description: true,
        },
      });

      // Group events by match id
      const eventsByMatch = new Map<number, typeof events>();
      for (const ev of events) {
        const list = eventsByMatch.get(ev.saveGameMatchId) ?? [];
        list.push(ev);
        eventsByMatch.set(ev.saveGameMatchId, list);
      }

      // 3) Map to summary shape
      const summary = matches.map((m) => ({
        matchId: m.id,
        home: m.homeTeam?.name ?? String(m.homeTeamId),
        away: m.awayTeam?.name ?? String(m.awayTeamId),
        score: `${m.homeGoals ?? 0} – ${m.awayGoals ?? 0}`,
        events: (eventsByMatch.get(m.id) ?? []).map((e) => ({
          minute: e.minute,
          type: e.type,
          desc: e.description,
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
