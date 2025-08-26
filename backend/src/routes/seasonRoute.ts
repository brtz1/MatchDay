// backend/src/routes/seasonRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { startSeason } from '../controllers/seasonController';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * POST /api/season/start
 * Initializes league tables and schedules all fixtures for the current save game.
 */
router.post('/start', startSeason);

/**
 * GET /api/season/matchday
 * Returns all matchdays for the current save game, each with its matches + events.
 */
router.get(
  '/matchday',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = await getCurrentSaveGameId();
      if (!saveGameId) {
        return res.status(400).json({ error: 'No active save game found' });
      }

      // 1) Matchdays (IDs only, then we stitch matches + events below)
      const matchdays = await prisma.matchday.findMany({
        where: { saveGameId },
        select: { id: true, number: true, type: true },
        orderBy: { number: 'asc' },
      });

      if (matchdays.length === 0) {
        return res.status(200).json([]);
      }

      const matchdayIds = matchdays.map((m) => m.id);

      // 2) All matches for those matchdays
      const matches = await prisma.saveGameMatch.findMany({
        where: {
          saveGameId,
          matchdayId: { in: matchdayIds },
        },
        select: {
          id: true,
          matchdayId: true,
          homeTeamId: true,
          awayTeamId: true,
          homeGoals: true,
          awayGoals: true,
        },
        orderBy: { id: 'asc' },
      });

      const matchIds = matches.map((m) => m.id);
      const teamIds = Array.from(
        new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))
      );

      // 3) Team names (to avoid relying on relation includes)
      const teams = await prisma.saveGameTeam.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      });
      const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

      // 4) Events for those matches (schema uses saveGameMatchId and 'type')
      const events = await prisma.matchEvent.findMany({
        where: { saveGameMatchId: { in: matchIds } },
        orderBy: { minute: 'asc' },
        select: {
          id: true,
          saveGameMatchId: true,
          minute: true,
          type: true,
          description: true,
          saveGamePlayerId: true,
        },
      });

      // Group events by match
      const eventsByMatch = new Map<number, typeof events>();
      for (const ev of events) {
        const list = eventsByMatch.get(ev.saveGameMatchId) ?? [];
        list.push(ev);
        eventsByMatch.set(ev.saveGameMatchId, list);
      }

      // Group matches by matchday and attach team names + events
      const matchesByMatchday = new Map<number, any[]>();
      for (const m of matches) {
        const arr = matchesByMatchday.get(m.matchdayId) ?? [];
        arr.push({
          id: m.id,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          home: teamNameById.get(m.homeTeamId) ?? String(m.homeTeamId),
          away: teamNameById.get(m.awayTeamId) ?? String(m.awayTeamId),
          homeGoals: m.homeGoals ?? 0,
          awayGoals: m.awayGoals ?? 0,
          events: (eventsByMatch.get(m.id) ?? []).map((e) => ({
            id: e.id,
            minute: e.minute,
            type: e.type,
            description: e.description,
            saveGamePlayerId: e.saveGamePlayerId,
          })),
        });
        matchesByMatchday.set(m.matchdayId, arr);
      }

      // Final shape
      const payload = matchdays.map((md) => ({
        id: md.id,
        number: md.number,
        type: md.type,
        matches: matchesByMatchday.get(md.id) ?? [],
      }));

      res.status(200).json(payload);
    } catch (error) {
      console.error('❌ Error fetching matchday:', error);
      next(error);
    }
  }
);

export default router;
