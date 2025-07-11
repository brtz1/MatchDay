// src/routes/transferRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { transferPlayer } from '../services/transferService';

const router = Router();

/**
 * GET /api/transfers
 * List all transfers (most recent first).
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const transfers = await prisma.transfer.findMany({
        include: {
          player: true,
          fromTeam: true,
          toTeam: true,
        },
        orderBy: { date: 'desc' },
      });
      res.status(200).json(transfers);
    } catch (error) {
      console.error('❌ Error fetching transfers:', error);
      next(error);
    }
  }
);

/**
 * POST /api/transfers
 * Create a new player transfer.
 * Body: { playerId: number; fromTeamId: number; toTeamId: number; fee: number }
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { playerId, fromTeamId, toTeamId, fee } = req.body;
      if (
        [playerId, fromTeamId, toTeamId, fee].some((v) => typeof v !== 'number')
      ) {
        res.status(400).json({ error: 'playerId, fromTeamId, toTeamId and fee must be numbers' });
        return;
      }
      const result = await transferPlayer(playerId, fromTeamId, toTeamId, fee);
      res.status(201).json(result);
    } catch (error) {
      console.error('❌ Error executing transfer:', error);
      next(error);
    }
  }
);

/**
 * DELETE /api/transfers/:transferId
 * Remove a transfer record.
 */
router.delete(
  '/:transferId',
  async (req: Request, res: Response, next: NextFunction) => {
    const transferId = Number(req.params.transferId);
    if (isNaN(transferId)) {
      res.status(400).json({ error: 'Invalid transferId' });
      return;
    }
    try {
      await prisma.transfer.delete({ where: { id: transferId } });
      res.status(204).send();
    } catch (error) {
      console.error('❌ Error deleting transfer:', error);
      next(error);
    }
  }
);

export default router;
