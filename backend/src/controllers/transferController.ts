import { Request, Response } from 'express';
import { transferPlayer } from '../services/transferService';

export const transfer = async (req: Request, res: Response) => {
  try {
    const { playerId, fromTeamId, toTeamId, fee } = req.body;

    const transfer = await transferPlayer(playerId, fromTeamId, toTeamId, fee);

    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Transfer failed' });
  }
};