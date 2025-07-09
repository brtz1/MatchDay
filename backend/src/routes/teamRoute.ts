import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * Get all teams
 */
router.get('/', async (_req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        division: true,
        coach: true,
      },
    });
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * Get a single team by ID
 */
router.get('/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        division: true,
        coach: true,
        players: true,
      },
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

/**
 * Get all players in a team
 */
router.get('/:teamId/players', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    const players = await prisma.player.findMany({
      where: { teamId },
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
    const nextMatch = await prisma.match.findFirst({
      where: {
        isPlayed: false,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
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
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        coach: true,
        division: true,
      },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch opponent info' });
  }
});

/**
 * Create a new team
 */
router.post('/', async (req, res) => {
  const { name, country, divisionId } = req.body;

  try {
    const newTeam = await prisma.team.create({
      data: {
        name,
        country,
        divisionId,
        stadiumSize: 10000,
        ticketPrice: 5,
        rating: 50,
  },
});
    res.status(201).json(newTeam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * Update an existing team
 */
router.put('/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  const { name, country, divisionId } = req.body;

  try {
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        country,
        divisionId,
      },
    });
    res.json(updatedTeam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

/**
 * Delete a team
 */
router.delete('/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    await prisma.team.delete({
      where: { id: teamId },
    });
    res.json({ message: 'Team deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

/**
 * Get team finances (placeholder logic)
 */
router.get('/:teamId/finances', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team ID' });

  try {
    // Replace with actual finance logic when implemented
    const players = await prisma.player.findMany({
      where: { teamId },
    });

    const totalSalaries = players.reduce((sum, p) => sum + (p.salary || 0), 0);

    res.json({
      salaryTotal: totalSalaries,
      salaryByPlayer: players.map(p => ({
        id: p.id,
        name: p.name,
        salary: p.salary,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load finances' });
  }
});

export default router;
