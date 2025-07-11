import { Request, Response, NextFunction } from 'express';
import prisma from '@/utils/prisma';

/**
 * GET /api/players
 * Returns all players with optional filters (teamId, position, nationality).
 */
export async function getAllPlayers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teamId, position, nationality } = req.query;
    const where: any = {};
    if (teamId) where.teamId = Number(teamId);
    if (position) where.position = String(position);
    if (nationality) where.nationality = String(nationality);

    const players = await prisma.player.findMany({
      where,
      include: {
        team: true,
        events: true,
      },
    });
    res.status(200).json(players);
  } catch (error) {
    console.error('❌ Error fetching players:', error);
    next(error);
  }
}

/**
 * GET /api/players/:id
 * Returns a single player by ID with team and matchStats.
 */
export async function getPlayerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const playerId = Number(req.params.id);
  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: true,
        matchStats: true,
        events: true,
      },
    });
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.status(200).json(player);
  } catch (error) {
    console.error(`❌ Error fetching player ${playerId}:`, error);
    next(error);
  }
}
