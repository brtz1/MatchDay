// backend/src/routes/summaryRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getGameState } from '../services/gameState';

const router = Router();

/**
 * GET /api/summary/:matchdayId
 * Returns a summary of all matches for a given matchday:
 * - home/away team info and scores
 * - ordered match events
 */
router.get('/:matchdayId', async (req: Request, res: Response, next: NextFunction) => {
  const matchdayId = Number(req.params.matchdayId);
  if (isNaN(matchdayId)) {
    return res.status(400).json({ error: 'Invalid matchday ID' });
  }

  try {
    const gameState = await getGameState();
    if (!gameState?.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }
    const saveGameId = gameState.currentSaveGameId;

    // 1) Fetch matches for this matchday (no fragile relation includes)
    const matches = await prisma.saveGameMatch.findMany({
      where: { saveGameId, matchdayId },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeGoals: true,
        awayGoals: true,
      },
      orderBy: { id: 'asc' },
    });

    if (matches.length === 0) {
      return res.status(200).json([]);
    }

    // 2) Resolve team names
    const teamIds = Array.from(new Set(matches.flatMap(m => [m.homeTeamId, m.awayTeamId])));
    const teams = await prisma.saveGameTeam.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map<number, string>(teams.map(t => [t.id, t.name]));

    // 3) Fetch ordered events for all matches
    const matchIds = matches.map(m => m.id);
    const events = await prisma.matchEvent.findMany({
      where: { saveGameMatchId: { in: matchIds } },
      orderBy: { minute: 'asc' },
      select: {
        saveGameMatchId: true,
        minute: true,
        type: true,          // schema field name
        description: true,
      },
    });

    // Group events by match
    const eventsByMatch = new Map<number, { minute: number; type: string; description: string }[]>();
    for (const e of events) {
      const bucket = eventsByMatch.get(e.saveGameMatchId) ?? [];
      bucket.push({ minute: e.minute, type: e.type as unknown as string, description: e.description });
      eventsByMatch.set(e.saveGameMatchId, bucket);
    }

    // 4) Build summary payload
    const summary = matches.map(m => ({
      matchId: m.id,
      home: {
        id: m.homeTeamId,
        name: nameById.get(m.homeTeamId) ?? String(m.homeTeamId),
        score: m.homeGoals ?? 0,
      },
      away: {
        id: m.awayTeamId,
        name: nameById.get(m.awayTeamId) ?? String(m.awayTeamId),
        score: m.awayGoals ?? 0,
      },
      events: (eventsByMatch.get(m.id) ?? []).map(ev => ({
        minute: ev.minute,
        type: ev.type,
        description: ev.description,
      })),
      // stats: [] // enable when/if match stats are added to schema
    }));

    res.status(200).json(summary);
  } catch (error) {
    console.error('❌ Error generating match summary:', error);
    next(error);
  }
});

export default router;
