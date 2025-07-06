import { Router } from 'express';
import { startSeason } from '../controllers/seasonController';

const router = Router();

router.post('/start', startSeason);

export default router;