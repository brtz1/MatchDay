import { Router } from 'express';
import { getAllTeams, getTeamById, createTeam } from '../controllers/teamController';

const router = Router();

// GET /api/teams (List all teams)
router.get('/', getAllTeams);

// GET /api/teams/:id (Get a specific team by ID)
router.get('/:id', getTeamById);

// POST /api/teams (Create a new team)
router.post('/', createTeam);

export default router;