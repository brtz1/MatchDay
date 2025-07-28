// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import newGameRoute from './routes/newGameRoute';
import saveGameRoute from './routes/saveGameRoute';
import saveGameTeamsRoute from './routes/saveGameTeamRoute';
import playerRoute from './routes/playerRoute';
import refereeRoute from './routes/refereeRoute';
import matchRoute from './routes/matchRoute';
import cupRoute from './routes/cupRoute';
import gameStateRoute from './routes/gameStateRoute';
import matchStateRoute from './routes/matchStateRoute';
import transferRoute from './routes/transferRoute';
import statsRoute from './routes/statsRoute';
import manualSaveRoute from './routes/manualSaveRoute';
import countryRoute from './routes/countryRoute';
import importRoute from './routes/importRoute';
import standingsRoute from './routes/standingsRoute';
import matchdayRoute from './routes/matchdayRoute';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK' });
});

// Routes
app.use('/api/new-game', newGameRoute);
app.use('/api/save-game', saveGameRoute);
app.use('/api/save-game-teams', saveGameTeamsRoute);
app.use('/api/players', playerRoute);
app.use('/api/referees', refereeRoute);
app.use('/api/matches', matchRoute);
app.use('/api/gamestate', gameStateRoute);
app.use('/api/matchstate', matchStateRoute);
app.use('/api/transfers', transferRoute);
app.use('/api/stats', statsRoute);
app.use('/api/manual-save', manualSaveRoute);
app.use('/api/countries', countryRoute);
app.use('/api/import', importRoute);
app.use('/api/standings', standingsRoute);
app.use('/api/cup', cupRoute);
app.use('/api/matchday', matchdayRoute);

export default app;
