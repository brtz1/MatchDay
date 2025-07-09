// src/socket.ts

import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // frontend dev port
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔴 Client disconnected:', socket.id);
    });
  });
}

// 🔁 Broadcast a live match event (goal, injury, red card, etc.)
export function broadcastEvent(event: any) {
  if (io) {
    io.emit('match-event', event);
    console.log('📢 Emitted match-event:', event);
  }
}

// 🔁 Broadcast a game stage change (ACTION, MATCHDAY, HALFTIME, RESULTS, etc.)
export function broadcastGameStage(stage: string) {
  if (io) {
    io.emit('stage-changed', { stage });
    console.log('📢 Emitted stage-changed:', stage);
  }
}

// 🔁 Optional: Broadcast full game clock minute update (if used for frontend clock)
export function broadcastMinute(minute: number) {
  if (io) {
    io.emit('match-minute', { minute });
    // Optional debug log
  }
}
