// backend/src/index.ts
import 'module-alias/register';
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';

import app from './app';
import { ensureGameState } from './services/gameState';

export let io: Server;

async function main() {
  try {
    await ensureGameState();
  } catch (err) {
    console.error("❌ Cannot ensure GameState. Likely DB not migrated yet.");
    throw err;
  }

  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  const httpServer = http.createServer(app);

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });

    socket.on('join-matchday', ({ matchdayId }) => {
      socket.join(`matchday:${matchdayId}`);
    });

    socket.on('leave-matchday', ({ matchdayId }) => {
      socket.leave(`matchday:${matchdayId}`);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`✅ MatchDay! backend running at http://localhost:${PORT}`);
  });
}

// 🛡️ Only run the server if NOT in a test environment
if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    console.error('❌ Fatal startup error:', err);
    process.exit(1);
  });
}
