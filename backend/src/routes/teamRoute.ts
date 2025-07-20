// backend/src/routes/teamRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    const teams = await prisma.saveGameTeam.findMany({
      where: { saveGameId },
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

router.get('/:teamId', async (req, res, next) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const team = await prisma.saveGameTeam.findFirst({
      where: { id: teamId, saveGameId },
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
      coachName: 'You',
      // stadiumCapacity: team.baseTeam?.stadiumCapacity ?? 0, // 🚫 Removed for now
    });
  } catch (err) {
    next(err);
  }
});

export default router;