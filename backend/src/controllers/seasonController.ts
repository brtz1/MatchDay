import { Request, Response, NextFunction } from 'express';
import * as seasonService from '../services/seasonService';
import { getGameState } from '../services/gameState';

/**
 * POST /api/season/start
 * Initializes league tables and schedules all fixtures for the season.
 */
export async function startSeason(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameState = await getGameState();

    if (!gameState || !gameState.currentSaveGameId || gameState.currentSaveGameId <= 0) {
      res.status(400).json({ error: "No active save game found" });
      return;
    }

    const saveGameId = gameState.currentSaveGameId;

    await seasonService.initializeLeagueTable(saveGameId);
    const fixtures = await seasonService.scheduleSeason(saveGameId);

    res.status(200).json({ fixtures });
  } catch (error) {
    console.error("❌ Failed to start season:", error);
    next(error);
  }
}
