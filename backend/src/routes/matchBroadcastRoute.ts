// src/routes/matchBroadcastRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { broadcastMatchday, LiveEvent } from '../services/matchBroadcastService';
import { getGameState } from '../services/gameState';

const router = Router();

/**
 * POST /api/broadcast/matchday
 * Kick off a live broadcast for the current matchday.
 * - Retrieves current GameState
 * - Finds the corresponding Matchday record
 * - Calls broadcastMatchday, which will emit events and invoke our callback
 * - Persists each LiveEvent into the matchEvent table
 */
router.post(
  '/matchday',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = await getGameState();
      // never null because getGameState throws if uninitialized

      const matchday = await prisma.matchday.findFirst({
        where: {
          number: state.currentMatchday,
          type: state.matchdayType,
        },
      });

      if (!matchday) {
        return res.status(404).json({ error: 'Matchday not found' });
      }

      // Start the async broadcast; events will be saved via the callback
      broadcastMatchday(matchday.id, async (event: LiveEvent) => {
        await prisma.matchEvent.create({
          data: {
            matchdayId: matchday.id,
            matchId: event.matchId,
            minute: event.minute,
            eventType: event.type,
            description: event.message,
            playerId: event.playerId,
          },
        });
      });

      res.status(200).json({ message: 'Matchday broadcast initiated' });
    } catch (error) {
      console.error('❌ Broadcast error:', error);
      next(error);
    }
  }
);

export default router;
