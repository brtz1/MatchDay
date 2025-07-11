import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = express.Router();

/**
 * GET /api/match-events/:matchdayId
 * Fetches all matches for a matchday with their events, grouped by match.
 */
router.get('/match-events/:matchdayId', async (req: Request, res: Response, next: NextFunction) => {
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
        events: {
          orderBy: { minute: 'asc' },
        },
      },
    });

    const grouped = matches.map((m) => ({
      matchId: m.id,
      homeTeam: {
        id: m.homeTeam.id,
        name: m.homeTeam.name,
        primaryColor: m.homeTeam.primaryColor,
        secondaryColor: m.homeTeam.secondaryColor,
      },
      awayTeam: {
        id: m.awayTeam.id,
        name: m.awayTeam.name,
        primaryColor: m.awayTeam.primaryColor,
        secondaryColor: m.awayTeam.secondaryColor,
      },
      events: m.events.map((e) => ({
        id: e.id,
        minute: e.minute,
        type: e.eventType,
        description: e.description,
        playerId: e.playerId,
      })),
    }));

    res.status(200).json(grouped);
  } catch (error) {
    console.error('❌ Error fetching match events:', error);
    next(error);
  }
});

export default router;
