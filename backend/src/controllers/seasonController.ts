import { Request, Response, NextFunction } from 'express';
import { scheduleSeason } from '../services/seasonService';
import { getGameState } from '../services/gameState';
import prisma from '../utils/prisma'; // ✅ add this to fetch teams

/**
 * POST /api/season/start
 * Initializes league tables and schedules all fixtures for the current save game.
 */
export async function startSeason(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gameState = await getGameState();

    if (!gameState || !gameState.currentSaveGameId || gameState.currentSaveGameId <= 0) {
      res.status(400).json({ error: 'No active save game found' });
      return;
    }

    const saveGameId = gameState.currentSaveGameId;

    // ✅ Fetch teams before passing to scheduleSeason
    const teams = await prisma.saveGameTeam.findMany({
      where: { saveGameId },
    });

    await scheduleSeason(saveGameId, teams);

    res.status(200).json({
      message: 'Season scheduled successfully.',
      saveGameId,
    });
  } catch (error) {
    console.error('❌ Failed to start season:', error);
    next(error);
  }
}
