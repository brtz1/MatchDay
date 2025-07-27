import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * GET /api/matches
 * Returns all matches with related teams, referee, and events.
 */
export async function getAllMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const matches = await prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
        events: true,
      },
    });
    res.status(200).json(matches);
  } catch (error) {
    console.error('❌ Error fetching matches:', error);
    next(error);
  }
}

/**
 * GET /api/matches/:id
 * Returns a single match by ID with relations.
 */
export async function getMatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const matchId = Number(req.params.id);
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
        events: true,
      },
    });
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.status(200).json(match);
  } catch (error) {
    console.error(`❌ Error fetching match ${matchId}:`, error);
    next(error);
  }
}
