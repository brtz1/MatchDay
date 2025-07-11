// src/routes/teamRoute.ts

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * GET /api/teams
 * List all teams in the current save game.
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = await getCurrentSaveGameId();
      const teams = await prisma.saveGameTeam.findMany({
        where: { saveGameId },
      });
      res.status(200).json(teams);
    } catch (error) {
      console.error('❌ Error fetching teams:', error);
      next(error);
    }
  }
);

/**
 * GET /api/teams/:teamId/players
 * List all players for a specific team in the current save game.
 */
router.get(
  '/:teamId/players',
  async (req: Request, res: Response, next: NextFunction) => {
    const teamId = Number(req.params.teamId);
    if (isNaN(teamId)) {
      res.status(400).json({ error: 'Invalid team ID' });
      return;
    }
    try {
      const saveGameId = await getCurrentSaveGameId();
      const players = await prisma.saveGamePlayer.findMany({
        where: { saveGameId, teamId },
        orderBy: { position: 'asc' },
      });
      res.status(200).json(players);
    } catch (error) {
      console.error('❌ Error fetching players for team:', error);
      next(error);
    }
  }
);

/**
 * GET /api/teams/:teamId/next-match
 * Get the next unplayed match for a given team.
 */
router.get(
  '/:teamId/next-match',
  async (req: Request, res: Response, next: NextFunction) => {
    const teamId = Number(req.params.teamId);
    if (isNaN(teamId)) {
      res.status(400).json({ error: 'Invalid team ID' });
      return;
    }
    try {
      const saveGameId = await getCurrentSaveGameId();
      const nextMatch = await prisma.saveGameMatch.findFirst({
        where: {
          saveGameId,
          played: false,
          OR: [
            { homeTeamId: teamId },
            { awayTeamId: teamId },
          ],
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          matchday: true,
        },
        orderBy: { matchDate: 'asc' },
      });
      if (!nextMatch) {
        res.status(404).json({ error: 'No upcoming match found' });
        return;
      }
      res.status(200).json(nextMatch);
    } catch (error) {
      console.error('❌ Error fetching next match:', error);
      next(error);
    }
  }
);

/**
 * GET /api/teams/opponent/:teamId
 * Fetch details for an opponent team by its ID.
 */
router.get(
  '/opponent/:teamId',
  async (req: Request, res: Response, next: NextFunction) => {
    const teamId = Number(req.params.teamId);
    if (isNaN(teamId)) {
      res.status(400).json({ error: 'Invalid team ID' });
      return;
    }
    try {
      const saveGameId = await getCurrentSaveGameId();
      const team = await prisma.saveGameTeam.findFirst({
        where: { id: teamId, saveGameId },
      });
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }
      res.status(200).json(team);
    } catch (error) {
      console.error('❌ Error fetching opponent team:', error);
      next(error);
    }
  }
);

/**
 * GET /api/teams/:teamId/finances
 * Returns total salary and breakdown for a team.
 */
router.get(
  '/:teamId/finances',
  async (req: Request, res: Response, next: NextFunction) => {
    const teamId = Number(req.params.teamId);
    if (isNaN(teamId)) {
      res.status(400).json({ error: 'Invalid team ID' });
      return;
    }
    try {
      const saveGameId = await getCurrentSaveGameId();
      const players = await prisma.saveGamePlayer.findMany({
        where: { saveGameId, teamId },
      });
      const salaryTotal = players.reduce((sum, p) => sum + (p.salary || 0), 0);
      const salaryByPlayer = players.map(p => ({
        id: p.id,
        name: p.name,
        salary: p.salary,
      }));
      res.status(200).json({ salaryTotal, salaryByPlayer });
    } catch (error) {
      console.error('❌ Error fetching team finances:', error);
      next(error);
    }
  }
);

/**
 * GET /api/teams/:teamId
 * Fetch high-level details for a specific team (for Team Roster screen).
 */
router.get(
  '/:teamId',
  async (req: Request, res: Response, next: NextFunction) => {
    const teamId = Number(req.params.teamId);
    if (isNaN(teamId)) {
      res.status(400).json({ error: 'Invalid team ID' });
      return;
    }
    try {
      const saveGameId = await getCurrentSaveGameId();
      const team = await prisma.saveGameTeam.findFirst({
        where: { id: teamId, saveGameId },
        include: {
          baseTeam: true,
          GameStates: true,
        },
      });
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }
      res.status(200).json({
        id: team.id,
        name: team.name,
        primaryColor: team.baseTeam?.primaryColor ?? '#facc15',
        secondaryColor: team.baseTeam?.secondaryColor ?? '#000000',
        country: team.baseTeam?.country ?? 'Unknown',
        division: { name: team.division },
        coach: {
          name: 'You',
          level: 1,
          morale: team.morale,
        },
      });
    } catch (error) {
      console.error('❌ Error fetching team details:', error);
      next(error);
    }
  }
);

export default router;
