import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

let io: Server;

/**
 * Initialize Socket.IO on the given HTTP server.
 * @param httpServer - An HTTP/S server instance
 */
export function initSocket(httpServer: ReturnType<typeof createServer>) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`🔴 Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });
}

/**
 * Emit a match event to all connected clients.
 * @param event - The event payload (goal, injury, card, etc.)
 */
export function broadcastEvent(event: unknown) {
  if (!io) {
    console.warn('Socket.IO not initialized before broadcastEvent');
    return;
  }
  io.emit('match-event', event);
  console.log('📢 Emitted match-event:', event);
}

/**
 * Emit a stage-changed event to all connected clients.
 * @param stage - One of ACTION, MATCHDAY, HALFTIME, RESULTS, STANDINGS
 */
export function broadcastGameStage(stage: string) {
  if (!io) {
    console.warn('Socket.IO not initialized before broadcastGameStage');
    return;
  }
  io.emit('stage-changed', { stage });
  console.log('📢 Emitted stage-changed:', stage);
}

/**
 * Emit a match-minute update for frontend clocks.
 * @param minute - Current match minute
 */
export function broadcastMinute(minute: number) {
  if (!io) {
    console.warn('Socket.IO not initialized before broadcastMinute');
    return;
  }
  io.emit('match-minute', { minute });
}
