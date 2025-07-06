import { Router } from 'express';
import {
  getAllMatches,
  getMatchById,
  createMatch,  // this will simulate a new match
} from '../controllers/matchController';

const router = Router();

// GET all matches
router.get('/', getAllMatches);

// GET match by id
router.get('/:id', getMatchById);

// POST create (simulate) match
router.post('/', createMatch);

export default router;