import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import teamRoutes from './routes/teamRoute';
import playerRoutes from './routes/playerRoute';
import refereeRoutes from './routes/refereeRoute';
import matchRoutes from './routes/matchRoute';
import seasonRoutes from './routes/seasonRoute';
import transferRoutes from './routes/transferRoute';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/referees', refereeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/season', seasonRoutes);
app.use('/api/transfers', transferRoutes);

// health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running!' });
});

export default app;