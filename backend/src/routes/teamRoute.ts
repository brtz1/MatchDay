import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Get all teams
 */
router.get('/', async (req, res) => {
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
 * Get a single team by id
 */
router.get('/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team id' });

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
 * Get players from a team
 */
router.get('/:teamId/players', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team id' });

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
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team id' });

  try {
    const nextMatch = await prisma.match.findFirst({
      where: {
        isPlayed: false,
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
        matchday: true,
      },
      orderBy: { matchDate: 'asc' },
    });
    res.json(nextMatch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch next match' });
  }
});

/**
 * Get opponent team info
 */
router.get('/info/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team id' });

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        coach: true,
        division: true,
      },
    });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch opponent' });
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
      },
    });
    res.status(201).json(newTeam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * Update a team
 */
router.put('/:teamId', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team id' });

  const { name, country, divisionId, budget } = req.body;

  try {
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        country,
        divisionId,
        budget,
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
  if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid team id' });

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

export default router;
