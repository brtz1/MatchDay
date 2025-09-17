// backend/src/sockets/io.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export const SOCKET_PATH = process.env.SOCKET_PATH ?? "/socket";
const SOCKET_DEBUG = process.env.SOCKET_DEBUG === "1";
const SOCKET_ORIGIN = process.env.CLIENT_URL ?? process.env.CORS_ORIGIN ?? "*";

export function roomForSave(saveGameId: number): string {
  return `save-${Number(saveGameId)}`;
}

type JoinPayload = { saveGameId?: number | string };
type LeavePayload = { saveGameId?: number | string };

export function initSocket(server: HTTPServer): Server {
  if (io) return io;

  io = new Server(server, {
    path: SOCKET_PATH, // ← FE uses "/socket"
    cors: {
      origin: SOCKET_ORIGIN,
      methods: ["GET", "POST"],
      credentials: false,
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 socket connected: ${socket.id} (path=${SOCKET_PATH})`);

    if (SOCKET_DEBUG) {
      socket.onAny((event, ...args) => {
        const first = Array.isArray(args) ? args[0] : undefined;
        // Keep logs concise in dev
        console.log(`🟣 [${socket.id}] ${event}`, first);
      });
    }

    socket.on("join-save", (payload: JoinPayload = {}) => {
      const n = Number(payload.saveGameId);
      if (Number.isFinite(n)) {
        const room = roomForSave(n);
        socket.join(room);
        if (SOCKET_DEBUG) console.log(`👥 ${socket.id} joined room ${room}`);
        socket.emit("joined-save", { saveGameId: n, room });
      } else {
        console.warn(`⚠️ ${socket.id} tried to join invalid saveGameId:`, payload.saveGameId);
        socket.emit("joined-save", { error: "invalid-saveGameId" });
      }
    });

    socket.on("leave-save", (payload: LeavePayload = {}) => {
      const n = Number(payload.saveGameId);
      if (Number.isFinite(n)) {
        const room = roomForSave(n);
        socket.leave(room);
        if (SOCKET_DEBUG) console.log(`👋 ${socket.id} left room ${room}`);
        socket.emit("left-save", { saveGameId: n, room });
      } else {
        console.warn(`⚠️ ${socket.id} tried to leave invalid saveGameId:`, payload.saveGameId);
        socket.emit("left-save", { error: "invalid-saveGameId" });
      }
    });

    socket.on("disconnect", (reason) => {
      if (SOCKET_DEBUG) console.log(`⚪ socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocket(server) first.");
  }
  return io;
}
