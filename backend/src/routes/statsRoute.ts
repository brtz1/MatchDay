import { Router } from 'express';
import { createPlayerStats, fetchPlayerStats } from '../controllers/statsController';

const router = Router();

router.post('/', createPlayerStats);
router.get('/:playerId', fetchPlayerStats);

export default router;
