import { Router } from 'express';
import prisma from '../utils/prisma';

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

    const summary = matches.map(match => ({
      matchId: match.id,
      home: {
        id: match.homeTeamId,
        name: match.homeTeam.name,
        score: match.homeScore ?? 0,
      },
      away: {
        id: match.awayTeamId,
        name: match.awayTeam.name,
        score: match.awayScore ?? 0,
      },
      events: match.events.map(e => ({
        minute: e.minute,
        type: e.eventType,
        description: e.description,
      })),
      stats: match.playerStats.map(s => ({
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
