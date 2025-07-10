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

    const grouped = matches.map(SaveGameMatch => ({
      matchId: SaveGameMatch.id,
      homeTeam: {
        id: SaveGameMatch.homeTeam.id,
        name: SaveGameMatch.homeTeam.name,
        primaryColor: SaveGameMatch.homeTeam.primaryColor,
        secondaryColor: SaveGameMatch.homeTeam.secondaryColor,
      },
      awayTeam: {
        id: SaveGameMatch.awayTeam.id,
        name: SaveGameMatch.awayTeam.name,
        primaryColor: SaveGameMatch.awayTeam.primaryColor,
        secondaryColor: SaveGameMatch.awayTeam.secondaryColor,
      },
      events: SaveGameMatch.events.map(MatchEvent => ({
        id: MatchEvent.id,
        minute: MatchEvent.minute,
        type: MatchEvent.eventType,
        description: MatchEvent.description,
      })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error('Error fetching match events:', err);
    res.status(500).json({ error: 'Failed to load match events' });
  }
});

export default router;
