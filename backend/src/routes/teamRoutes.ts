import { Router } from 'express';
import {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../controllers/teamController';

const router = Router();

// GET all teams
router.get('/', getAllTeams);

// GET team by id
router.get('/:id', getTeamById);

// POST create team
router.post('/', createTeam);

// PUT update team
router.put('/:id', updateTeam);

// DELETE team
router.delete('/:id', deleteTeam);

export default router;