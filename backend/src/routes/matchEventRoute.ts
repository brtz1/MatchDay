import express from 'express';
import prisma from '../utils/prisma';

const router = express.Router();

// GET /api/match-events/:matchdayId
router.get('/match-events/:matchdayId', async (req, res) => {
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

    const grouped = matches.map(match => ({
      matchId: match.id,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        primaryColor: match.homeTeam.primaryColor,
        secondaryColor: match.homeTeam.secondaryColor,
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        primaryColor: match.awayTeam.primaryColor,
        secondaryColor: match.awayTeam.secondaryColor,
      },
      events: match.events.map(e => ({
        id: e.id,
        minute: e.minute,
        type: e.eventType,
        description: e.description,
      })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error('Error fetching match events:', err);
    res.status(500).json({ error: 'Failed to load match events' });
  }
});

export default router;
