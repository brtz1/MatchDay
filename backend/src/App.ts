import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import newGameRoute from './routes/newGameRoute';
import saveGameRoute from './routes/saveGameRoute';
import teamRoute from './routes/teamRoute';
import playerRoute from './routes/playerRoute';
import refereeRoute from './routes/refereeRoute';
import matchRoute from './routes/matchRoute';
import matchdayRoute from './routes/matchdayRoute';
import gameStateRoute from './routes/gameStateRoute';
import matchStateRoute from './routes/matchStateRoute';
import transferRoute from './routes/transferRoute';
import statsRoute from './routes/statsRoute';
import saveGamesRoute from './routes/manualSaveRoute';
import countryRoute from './routes/countryRoute';
import importRoute from './routes/importRoute';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// API routes
app.use('/api/new-game', newGameRoute);
app.use('/api/save-game', saveGameRoute);
app.use('/api/save-game-teams', teamRoute);
app.use('/api/teams', teamRoute);      // alias
app.use('/api/players', playerRoute);
app.use('/api/referees', refereeRoute);
app.use('/api/matches', matchRoute);
app.use('/api/matchdays', matchdayRoute);
app.use('/api/gamestate', gameStateRoute);
app.use('/api/matchstate', matchStateRoute);
app.use('/api/transfers', transferRoute);
app.use('/api/stats', statsRoute);
app.use('/api/manual-save', saveGamesRoute);
app.use('/api/countries', countryRoute);
app.use('/api/import', importRoute);

export default app;
