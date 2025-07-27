import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getGameState } from '../services/gameState';

const router = Router();

/**
 * GET /api/teams
 * Returns all teams in the current save game with their base team info
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const teams = await prisma.saveGameTeam.findMany({
      where: { saveGameId: gameState.currentSaveGameId },
      include: {
        baseTeam: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            country: true,
          },
        },
      },
    });

    res.json(teams);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/teams/:teamId
 * Returns details for a specific team (used for roster view)
 */
router.get('/:teamId', async (req: Request, res: Response, next: NextFunction) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const team = await prisma.saveGameTeam.findFirst({
      where: {
        id: teamId,
        saveGameId: gameState.currentSaveGameId,
      },
      include: {
        baseTeam: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            country: true,
          },
        },
      },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json({
      id: team.id,
      name: team.name,
      primaryColor: team.baseTeam?.primaryColor ?? '#facc15',
      secondaryColor: team.baseTeam?.secondaryColor ?? '#000000',
      country: team.baseTeam?.country ?? 'Unknown',
      division: team.division,
      morale: team.morale,
      coachName: 'You', // Static label for now; could be dynamic later
    });
  } catch (err) {
    next(err);
  }
});

export default router;
