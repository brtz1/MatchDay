import express from 'express';
import { PrismaClient } from '@prisma/client';
import { broadcastMatchday } from '../services/matchBroadcastService';
import { GameState } from '../state/gameState';

const prisma = new PrismaClient();
const router = express.Router();

router.post('/broadcast-matchday', async (req, res) => {
  try {
    const state = await GameState.get();
    if (!state) return res.status(404).json({ error: 'GameState not found' });

    const matchday = await prisma.matchday.findFirst({
      where: {
        number: state.currentMatchday,
        type: state.matchdayType,
      },
    });

    if (!matchday) return res.status(404).json({ error: 'Matchday not found' });

    broadcastMatchday(matchday.id, async (event) => {
      await prisma.matchEvent.create({
        data: {
          matchdayId: matchday.id,
          matchId: await findMatchIdByTeams(matchday.id, event),
          minute: event.minute,
          eventType: event.type,
          description: event.message,
        },
      });
    });

    res.json({ message: 'Match broadcast started' });
  } catch (e) {
    console.error('Broadcast error:', e);
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

async function findMatchIdByTeams(matchdayId: number, event: any): Promise<number> {
  const match = await prisma.match.findFirst({
    where: {
      matchdayId,
      OR: [
        { homeTeam: { name: { contains: event.message.split(' ')[1] } } },
        { awayTeam: { name: { contains: event.message.split(' ')[1] } } },
      ],
    },
  });

  return match?.id || 1;
}

export default router;
