import { Router } from 'express';
import {
  getAllPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from '../controllers/playerController';

const router = Router();

// GET all players
router.get('/', getAllPlayers);

// GET player by id
router.get('/:id', getPlayerById);

// POST create player
router.post('/', createPlayer);

// PUT update player
router.put('/:id', updatePlayer);

// DELETE player
router.delete('/:id', deletePlayer);

export default router;