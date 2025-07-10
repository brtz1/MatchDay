import { Router } from 'express';
import prisma from '../utils/prisma';
import { match } from 'node:assert/strict';
import { Stats } from 'node:fs';

const router = Router();

// GET /api/summary/:matchdayId
router.get('/summary/:matchdayId', async (req, res) => {
  const matchdayId = parseInt(req.params.matchdayId);
  if (isNaN(matchdayId)) return res.status(400).json({ error: 'Invalid matchday ID' });

  try {
    const matches = await prisma.match.findMany({
      where: { matchdayId },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: true,
        playerStats: {
          include: { player: true },
        },
      },
    });

    const summary = matches.map(SaveGameMatch => ({
      matchId: SaveGameMatch.id,
      home: {
        id: SaveGameMatch.homeTeamId,
        name: SaveGameMatch.homeTeam.name,
        score: SaveGameMatch.homeScore ?? 0,
      },
      away: {
        id: SaveGameMatch.awayTeamId,
        name: SaveGameMatch.awayTeam.name,
        score: SaveGameMatch.awayScore ?? 0,
      },
      events: SaveGameMatch.events.map(MatchEvent => ({
        minute: MatchEvent.minute,
        type: MatchEvent.eventType,
        description: MatchEvent.description,
      })),
      stats: SaveGameMatch.playerStats.map(s => ({
        playerId: s.playerId,
        name: s.player.name,
        position: s.player.position,
        goals: s.goals,
        assists: s.assists,
        yellow: s.yellow,
        red: s.red,
      })),
    }));

    res.json(summary);
  } catch (e) {
    console.error('Summary error:', e);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;
