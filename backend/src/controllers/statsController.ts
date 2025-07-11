// src/controllers/statsController.ts

import { Request, Response, NextFunction } from 'express';
import {
  recordPlayerStats,
  getPlayerStats,
  RecordPlayerStatsDto,
} from '@/services/statsService';

/**
 * POST /api/stats
 * Record stats for a player in a match.
 */
export async function createPlayerStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: RecordPlayerStatsDto = {
      playerId: Number(req.body.playerId),
      matchId: Number(req.body.matchId),
      goals: Number(req.body.goals),
      assists: Number(req.body.assists),
      yellow: Number(req.body.yellow),
      red: Number(req.body.red),
    };

    const stats = await recordPlayerStats(dto);
    res.status(201).json(stats);
  } catch (error) {
    console.error('❌ Error creating player stats:', error);
    next(error);
  }
}

/**
 * GET /api/stats/:playerId
 * Fetch aggregated stats for a specific player across all matches.
 */
export async function fetchPlayerStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const playerId = Number(req.params.playerId);
    const stats = await getPlayerStats(playerId);
    res.status(200).json(stats);
  } catch (error) {
    console.error('❌ Error fetching player stats:', error);
    next(error);
  }
}
