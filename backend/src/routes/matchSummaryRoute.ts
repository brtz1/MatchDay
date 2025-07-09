// src/routes/matchSummaryRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

router.get('/match-summary/:matchdayId', async (req, res) => {
  const matchdayId = parseInt(req.params.matchdayId);
  if (isNaN(matchdayId)) return res.status(400).json({ error: 'Invalid matchday ID' });

  try {
    const matches = await prisma.match.findMany({
      where: { matchdayId },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: {
          orderBy: { minute: 'asc' },
        },
      },
    });

    const summary = matches.map((m) => ({
      matchId: m.id,
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      score: `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`,
      events: m.events.map((e) => ({
        minute: e.minute,
        type: e.eventType,
        desc: e.description,
      })),
    }));

    res.json(summary);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load match summary' });
  }
});

export default router;
