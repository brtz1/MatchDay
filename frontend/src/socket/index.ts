import { io, type Socket } from "socket.io-client";

/**
 * ---------------------------------------------------------------------------
 * Configuration
 * ---------------------------------------------------------------------------
 *
 * `VITE_SOCKET_URL` can point to prod / staging server.
 * Falls back to `VITE_API_URL` (REST base) or localhost.
 */
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:4000";

/**
 * Use a single, shared socket instance across the entire app.
 */
const socket: Socket = io(SOCKET_URL, {
  path: "/socket",            // adjust if backend uses a custom path
  transports: ["websocket"],  // modern browsers → websocket first
  autoConnect: false,         // call socket.connect() when ready
  withCredentials: true,      // include cookies if your auth relies on them
});

/* --------------------------------------------------------------------- Debug */
if (import.meta.env.DEV) {
  socket.on("connect", () =>
    console.info("[socket] connected:", socket.id)
  );
  socket.on("disconnect", (reason) =>
    console.info("[socket] disconnected:", reason)
  );
  socket.on("connect_error", (err) =>
    console.error("[socket] connection error:", err.message)
  );
}

/**
 * Export singleton for app-wide use.
 *
 * Typical startup (e.g. in `main.tsx`):
 *
 * ```ts
 * import socket from "@/socket";
 *
 * socket.connect();   // establish connection once user is authenticated
 * ```
 */
export default socket;
