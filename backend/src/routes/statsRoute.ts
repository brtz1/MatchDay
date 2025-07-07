import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Get top scorers
 */
router.get('/top-scorers', async (_req, res) => {
  try {
    const scorers = await prisma.playerMatchStats.groupBy({
      by: ['playerId'],
      _sum: { goals: true },
      orderBy: { _sum: { goals: 'desc' } },
      take: 10,
    });

    const enriched = await Promise.all(
      scorers.map(async s => {
        const player = await prisma.player.findUnique({
          where: { id: s.playerId },
        });
        return {
          playerId: s.playerId,
          playerName: player?.name,
          totalGoals: s._sum.goals,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch top scorers' });
  }
});

/**
 * Get stats for a single player
 */
router.get('/player/:playerId', async (req, res) => {
  const playerId = parseInt(req.params.playerId);
  if (isNaN(playerId)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const stats = await prisma.playerMatchStats.findMany({
      where: { playerId },
      include: { match: true },
    });
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

export default router;
