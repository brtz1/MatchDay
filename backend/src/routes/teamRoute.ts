import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * Get all save game teams
 */
router.get('/', async (_req, res) => {
  try {
    const teams = await prisma.saveGameTeam.findMany();
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * Get a single save game team by ID
 */
router.get('/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const team = await prisma.saveGameTeam.findUnique({
      where: { id: teamId },
      include: {
        players: true,
        baseTeam: true,
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
      coach: {
        name: 'You',
        level: 1,
        morale: team.morale,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

/**
 * Get all players in a save game team
   */
router.get('/:teamId/players', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const players = await prisma.saveGamePlayer.findMany({
      where: { teamId: teamId },
      orderBy: { position: 'asc' },
    });
    res.json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching players' });
  }
});

/**
 * Get next match for a team
 */
router.get('/:teamId/next-match', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const nextMatch = await prisma.saveGameMatch.findFirst({
      where: {
        played: false,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        matchday: true,
      },
      orderBy: { matchDate: 'asc' },
    });

    if (!nextMatch) return res.status(404).json({ error: 'No upcoming match found' });

    res.json(nextMatch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch next match' });
  }
});

/**
 * Get opponent team info
 */
router.get('/opponent/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const team = await prisma.saveGameTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch opponent info' });
  }
});

/**
 * Get team finances (placeholder logic)
 */
router.get('/:teamId/finances', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const players = await prisma.saveGamePlayer.findMany({
      where: { saveGameId: teamId },
    });

    const totalSalaries = players.reduce((sum, player) => sum + (player.salary || 0), 0);

    res.json({
      salaryTotal: totalSalaries,
      salaryByPlayer: players.map(player => ({
        id: player.id,
        name: player.name,
        salary: player.salary,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load finances' });
  }
});

export default router;
