// src/routes/index.ts
import { Router } from 'express';
import teamRoute from './teamRoute';
import transferRoute from './transferRoute';
import matchRoute from './matchRoute';
import matchdayRoute from './matchdayRoute';
import gameStateRoute from './gameStateRoute';
import saveGameRoute from './saveGameRoute';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/teams', teamRoute);
router.use('/transfers', transferRoute);
router.use('/matches', matchRoute);
router.use('/matchdays', matchdayRoute);
router.use('/gamestate', gameStateRoute);
router.use('/save-game', saveGameRoute);

export default router;
