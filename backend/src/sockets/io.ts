// backend/src/sockets/io.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export const SOCKET_PATH = process.env.SOCKET_PATH ?? "/socket";
const SOCKET_DEBUG = process.env.SOCKET_DEBUG === "1";

export function roomForSave(saveGameId: number) {
  return `save-${saveGameId}`;
}

export function initSocket(server: HTTPServer) {
  if (io) return io;

  io = new Server(server, {
    path: SOCKET_PATH,
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 socket connected: ${socket.id} (path=${SOCKET_PATH})`);

    if (SOCKET_DEBUG) {
      socket.onAny((event, ...args) => {
        // Keep logs concise in dev
        console.log(`🟣 [${socket.id}] ${event}`, Array.isArray(args) ? args[0] : args);
      });
    }

    socket.on("join-save", (payload: { saveGameId?: number | string }) => {
      const n = Number(payload?.saveGameId);
      if (Number.isFinite(n)) {
        const room = roomForSave(n);
        socket.join(room);
        console.log(`👥 ${socket.id} joined room ${room}`);
        socket.emit("joined-save", { saveGameId: n, room });
      } else {
        console.warn(`⚠️ ${socket.id} tried to join invalid saveGameId:`, payload?.saveGameId);
        socket.emit("joined-save", { error: "invalid-saveGameId" });
      }
    });

    socket.on("leave-save", (payload: { saveGameId?: number | string }) => {
      const n = Number(payload?.saveGameId);
      if (Number.isFinite(n)) {
        const room = roomForSave(n);
        socket.leave(room);
        console.log(`👋 ${socket.id} left room ${room}`);
        socket.emit("left-save", { saveGameId: n, room });
      } else {
        console.warn(`⚠️ ${socket.id} tried to leave invalid saveGameId:`, payload?.saveGameId);
        socket.emit("left-save", { error: "invalid-saveGameId" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`⚪ socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized. Call initSocket(server) first.");
  return io;
}
