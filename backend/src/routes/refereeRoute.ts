import { Router } from 'express';
import {
  getAllReferees,
  getRefereeById,
} from '../controllers/refereeController';

const router = Router();

// GET all referees
router.get('/', getAllReferees);

// GET referee by id
router.get('/:id', getRefereeById);

export default router;