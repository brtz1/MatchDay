import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = Router();

/**
 * GET /api/save-game-teams
 * List all teams in the current save game.
 */
router.get('/', async (_req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    const teams = await prisma.saveGameTeam.findMany({ where: { saveGameId } });
    res.json(teams);
  } catch (err) {
    console.error('❌ Error fetching teams:', err);
    next(err);
  }
});

/**
 * GET /api/save-game-teams/:teamId/players
 */
router.get('/:teamId/players', async (req, res, next) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const players = await prisma.saveGamePlayer.findMany({
      where: { saveGameId, teamId },
      orderBy: { position: 'asc' },
    });
    res.json(players);
  } catch (err) {
    console.error('❌ Error fetching players for team:', err);
    next(err);
  }
});

/**
 * GET /api/save-game-teams/:teamId/next-match
 */
router.get('/:teamId/next-match', async (req, res, next) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const nextMatch = await prisma.saveGameMatch.findFirst({
      where: {
        saveGameId,
        played: false,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: { homeTeam: true, awayTeam: true, matchday: true },
      orderBy: { matchDate: 'asc' },
    });
    if (!nextMatch) return res.status(404).json({ error: 'No upcoming match found' });
    res.json(nextMatch);
  } catch (err) {
    console.error('❌ Error fetching next match:', err);
    next(err);
  }
});

/**
 * GET /api/save-game-teams/opponent/:teamId
 */
router.get('/opponent/:teamId', async (req, res, next) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const team = await prisma.saveGameTeam.findFirst({ where: { id: teamId, saveGameId } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('❌ Error fetching opponent team:', err);
    next(err);
  }
});

/**
 * GET /api/save-game-teams/:teamId/finances
 */
router.get('/:teamId/finances', async (req, res, next) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const players = await prisma.saveGamePlayer.findMany({ where: { saveGameId, teamId } });
    const salaryTotal = players.reduce((sum, p) => sum + (p.salary || 0), 0);
    const salaryByPlayer = players.map((p) => ({ id: p.id, name: p.name, salary: p.salary }));
    res.json({ salaryTotal, salaryByPlayer });
  } catch (err) {
    console.error('❌ Error fetching team finances:', err);
    next(err);
  }
});

/**
 * GET /api/save-game-teams/:teamId
 */
router.get('/:teamId', async (req, res, next) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    const team = await prisma.saveGameTeam.findFirst({
      where: { id: teamId, saveGameId },
      include: {
        baseTeam: true,    // relation name exactly as in schema
        GameStates: true,  // now matches the Pascal-case field from your model
      },
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json({
      id: team.id,
      name: team.name,
      primaryColor: team.baseTeam?.primaryColor ?? '#facc15',
      secondaryColor: team.baseTeam?.secondaryColor ?? '#000000',
      country: team.baseTeam?.country ?? 'Unknown',
      division: { name: team.division },
      coach: { name: 'You', level: 1, morale: team.morale },
    });
  } catch (err) {
    console.error('❌ Error fetching team details:', err);
    next(err);
  }
});

export default router;
