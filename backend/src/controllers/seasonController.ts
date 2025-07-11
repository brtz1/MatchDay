import { Request, Response, NextFunction } from 'express';
import * as seasonService from '@/services/seasonService';

/**
 * POST /api/season/start
 * Initializes league tables and schedules all fixtures for the season.
 */
export async function startSeason(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await seasonService.initializeLeagueTable();
    const fixtures = await seasonService.scheduleSeason();
    res.status(200).json({ fixtures });
  } catch (error) {
    console.error('❌ Failed to start season:', error);
    next(error);
  }
}
