import { Router } from 'express';
import { getAllReferees, getRefereeById } from '../controllers/refereeController';

const router = Router();

/**
 * GET /api/referees
 * Fetch all referees (static lookup data).
 */
router.get('/', getAllReferees);

/**
 * GET /api/referees/:id
 * Fetch one referee by ID (static lookup data).
 */
router.get('/:id', getRefereeById);

export default router;
