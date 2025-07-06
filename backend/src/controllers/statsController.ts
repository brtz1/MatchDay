// backend/src/controllers/statsController.ts

import { Request, Response } from 'express';
import { recordPlayerStats, getPlayerStats } from '../services/statsService';

// POST /api/stats
export const createPlayerStats = async (req: Request, res: Response) => {
  try {
    const { playerId, matchId, goals, assists, yellow, red } = req.body;

    const stats = await recordPlayerStats(
      playerId,
      matchId,
      goals,
      assists,
      yellow,
      red
    );

    res.status(201).json(stats);
  } catch (err) {
    console.error(
      'Stats creation error:',
      JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
    );
    res.status(400).json({
      error:
        err instanceof Error
          ? err.message
          : 'Failed to create player stats',
    });
  }
};

// GET /api/stats/:playerId
export const fetchPlayerStats = async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const stats = await getPlayerStats(playerId);
    res.status(200).json(stats);
  } catch (err) {
    console.error(
      'Stats fetch error:',
      JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
    );
    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : 'Failed to fetch player stats',
    });
  }
};
