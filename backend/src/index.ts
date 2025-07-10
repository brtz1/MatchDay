// src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

import routes from './routes/Routes';
import gameStateRoute from './routes/gameStateRoute';
import saveGameRoute from './routes/saveGameRoute';
import teamRoute from './routes/teamRoute';
import countryRoute from './routes/countryRoute';
import manualSaveRoute from './routes/manualSaveRoute';

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api', routes);
app.use('/api/gamestate', gameStateRoute); // ✅ Ensure this is present
app.use('/api/save-game', saveGameRoute);
app.use('/team', teamRoute);
app.use('/api/countries', countryRoute);
app.use('/api/manual-save', manualSaveRoute);

// Define PORT before using it and ensure it's a number
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
;

// Socket setup
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅ MatchDay! backend running at http://localhost:${PORT}`);
});
