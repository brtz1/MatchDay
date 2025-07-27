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
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const matches = await prisma.saveGameMatch.findMany({
      where: {
        saveGameId: gameState.currentSaveGameId,
        matchdayId,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        MatchEvent: { orderBy: { minute: 'asc' } },
        // matchStats: true, // enable if/when relation is added to Prisma schema
      },
    });

    const summary = matches.map((m) => ({
      matchId: m.id,
      home: {
        id: m.homeTeamId,
        name: m.homeTeam.name,
        score: m.homeGoals ?? 0,
      },
      away: {
        id: m.awayTeamId,
        name: m.awayTeam.name,
        score: m.awayGoals ?? 0,
      },
      events: m.MatchEvent.map((e: any) => ({
        minute: e.minute,
        type: e.eventType,
        description: e.description,
      })),
      // stats: m.matchStats?.map((s: any) => ({
      //   playerId: s.playerId,
      //   name: s.player.name,
      //   position: s.player.position,
      //   goals: s.goals,
      //   assists: s.assists,
      //   yellow: s.yellow,
      //   red: s.red,
      // })) ?? [],
    }));

    res.status(200).json(summary);
  } catch (error) {
    console.error('❌ Error generating match summary:', error);
    next(error);
  }
});

export default router;
