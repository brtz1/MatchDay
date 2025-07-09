// src/routes/statsRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.playerMatchStats.findMany({
      include: { player: true },
    });

    const totals = new Map<number, any>();

    for (const stat of stats) {
      const current = totals.get(stat.playerId) || {
        id: stat.playerId,
        name: stat.player.name,
        nationality: stat.player.nationality,
        position: stat.player.position,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
      };

      current.goals += stat.goals;
      current.assists += stat.assists;
      current.yellow += stat.yellow;
      current.red += stat.red;

      totals.set(stat.playerId, current);
    }

    const list = Array.from(totals.values());
    list.sort((a, b) => b.goals - a.goals || b.assists - a.assists);

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load player stats' });
  }
});

export default router;
