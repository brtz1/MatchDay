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
import matchEventRoute from './routes/matchEventRoute';
import nextMatchRoute from './routes/nextMatchRoute';
import h2hRoute from './routes/h2hRoute';
import goldenBootRoute from './routes/goldenBootRoute';
import statsSyncRoute from './routes/statsSyncRoute';
import formationRoute from './routes/formationRoute';

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Health check (return JSON once)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
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
app.use('/api/matches', nextMatchRoute);
app.use('/api/matches', h2hRoute);
app.use('/api/match-events', matchEventRoute);
app.use('/api/golden-boot', goldenBootRoute);
app.use('/api/stats', statsSyncRoute);
app.use('/api/formation', formationRoute);

// 404 JSON fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Error handler (JSON)
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Unhandled error:', err);
    const status = typeof err?.status === 'number' ? err.status : 500;
    res.status(status).json({
      error: status === 500 ? 'Internal Server Error' : 'Request Failed',
      message: err?.message ?? 'Unexpected error',
    });
  }
);

export default app;
