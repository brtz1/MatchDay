import { Request, Response, NextFunction } from 'express';
import * as transferService from '@/services/transferService';

/**
 * POST /api/transfers
 * Transfer a player from one save-game team to another.
 */
export async function transferPlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { playerId, fromTeamId, toTeamId, fee } = req.body;
    
    // Validate and convert inputs
    const pid = Number(playerId);
    const fromId = fromTeamId !== undefined && fromTeamId !== null ? Number(fromTeamId) : null;
    const toId = Number(toTeamId);
    const transferFee = Number(fee);

    if (isNaN(pid) || isNaN(toId) || isNaN(transferFee)) {
      res.status(400).json({ error: 'playerId, toTeamId, and fee must be valid numbers' });
      return;
    }

    const result = await transferService.transferPlayer(pid, fromId, toId, transferFee);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error processing transfer:', error);
    next(error);
  }
}
