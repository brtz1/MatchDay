// backend/src/routes/routes.ts

import express, { Router, Request, Response } from 'express';

import newGameRoute from './newGameRoute';
import saveGameRoute from './saveGameRoute';
import manualSaveRoute from './manualSaveRoute';

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
import cupRoute from './cupRoute';
import standingsRoute from './standingsRoute';
import matchEventRoute from './matchEventRoute';
import matchSummaryRoute from './matchSummaryRoute';

const router: Router = express.Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

// New Game
router.use('/new-game', newGameRoute);

// Save Game
router.use('/save-game', saveGameRoute);
router.use('/manual-save', manualSaveRoute);

// Core Data
router.use('/teams', teamRoute);
router.use('/players', playerRoute);
router.use('/referees', refereeRoute);
router.use('/standings', standingsRoute);
router.use('/match-events', matchEventRoute);

// Matchday & Game Flow
router.use('/matchdays', matchdayRoute);
router.use('/gamestate', gameStateRoute);
router.use('/matchstate', matchStateRoute);

// Matches & Transfers
router.use('/matches', matchRoute);
router.use('/transfers', transferRoute);
router.use('/stats', statsRoute);
router.use('/match-summary', matchSummaryRoute);

// Season & Utilities
router.use('/season', seasonRoute);
router.use('/countries', countryRoute);
router.use('/import', importRoute);

// 🏆 Cup
router.use('/cup', cupRoute);

export default router;
