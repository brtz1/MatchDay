import express, { Router, Request, Response } from 'express';
import newGameRoute from './newGameRoute';
import saveGameRoute from './saveGameRoute';
import teamRoute from './teamRoute';
import playerRoute from './playerRoute';
import refereeRoute from './refereeRoute';
import transferRoute from './transferRoute';
import matchRoute from './matchRoute';
import matchdayRoute from './matchdayRoute';
import gameStateRoute from './gameStateRoute';
import matchStateRoute from './matchStateRoute';
import statsRoute from './statsRoute';
import seasonRoute from './seasonRoute';
import importRoute from './importRoute';
import countryRoute from './countryRoute';
import manualSaveRoute from './manualSaveRoute';

const router: Router = express.Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

// New game setup
router.use('/new-game', newGameRoute);

// Save game operations
router.use('/save-game', saveGameRoute);
router.use('/save-game-teams', teamRoute);

// Team and player data
router.use('/teams', teamRoute);
router.use('/players', playerRoute);

// Matchday and game flow
router.use('/matchdays', matchdayRoute);
router.use('/gamestate', gameStateRoute);
router.use('/matchstate', matchStateRoute);

// Match operations
router.use('/matches', matchRoute);

// Transfers and stats
router.use('/transfers', transferRoute);
router.use('/stats', statsRoute);

// Referees and season
router.use('/referees', refereeRoute);
router.use('/season', seasonRoute);

// Utility and import
router.use('/import', importRoute);
router.use('/countries', countryRoute);
router.use('/manual-save', manualSaveRoute);

export default router;
