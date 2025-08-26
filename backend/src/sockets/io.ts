// backend/src/sockets/io.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export function initSocket(server: HTTPServer) {
  if (io) return io;

  io = new Server(server, {
    path: "/socket",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 socket connected: ${socket.id}`);

    socket.on("join-save", ({ saveGameId }: { saveGameId?: number }) => {
      if (typeof saveGameId === "number") {
        socket.join(`save-${saveGameId}`);
        console.log(`👥 ${socket.id} joined room save-${saveGameId}`);
      }
    });

    socket.on("leave-save", ({ saveGameId }: { saveGameId?: number }) => {
      if (typeof saveGameId === "number") {
        socket.leave(`save-${saveGameId}`);
        console.log(`👋 ${socket.id} left room save-${saveGameId}`);
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
