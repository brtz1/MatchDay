import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { broadcastMatchday, LiveEvent } from '../services/matchBroadcastService';
import { getGameState } from '../services/gameState';

const router = Router();

/**
 * POST /api/broadcast/matchday
 * Kick off a live broadcast for the current matchday.
 * - Validates saveGameId
 * - Retrieves current matchday based on GameState
 * - Starts broadcasting and persists each LiveEvent
 */
router.post(
  '/matchday',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = await getGameState();

      if (!state?.currentSaveGameId || state.currentSaveGameId <= 0) {
        return res.status(400).json({ error: 'No active save game found' });
      }

      const matchday = await prisma.matchday.findFirst({
        where: {
          saveGameId: state.currentSaveGameId,
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
            saveGamePlayerId: event.saveGamePlayerId,
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
