import 'module-alias/register';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

import newGameRoute from './routes/newGameRoute';
import saveGameRoute from './routes/saveGameRoute';
import teamRoute from './routes/teamRoute';
import playerRoute from './routes/playerRoute';
import transferRoute from './routes/transferRoute';
import matchRoute from './routes/matchRoute';
import matchdayRoute from './routes/matchdayRoute';
import gameStateRoute from './routes/gameStateRoute';
import matchStateRoute from './routes/matchStateRoute';
import manualSaveRoute from './routes/manualSaveRoute';
import countryRoute from './routes/countryRoute';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// API routes
app.use('/api/new-game', newGameRoute);
app.use('/api/save-game', saveGameRoute);
app.use('/api/save-game-teams', teamRoute);
app.use('/api/players', playerRoute);
app.use('/api/transfers', transferRoute);
app.use('/api/matches', matchRoute);
app.use('/api/matchdays', matchdayRoute);
app.use('/api/gamestate', gameStateRoute);
app.use('/api/matchstate', matchStateRoute);
app.use('/api/manual-save', manualSaveRoute);
app.use('/api/countries', countryRoute);

// Create HTTP & Socket.io server
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅ MatchDay! backend running at http://localhost:${PORT}`);
});
