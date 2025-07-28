import { io, type Socket } from "socket.io-client";

/* ----------------------------------------------------------------------------
 * Configuration
 * ----------------------------------------------------------------------------
 * SOCKET_URL:
 * - Uses VITE_SOCKET_URL if defined (for production or staging)
 * - Falls back to VITE_API_URL or localhost:4000 by default
 * ----------------------------------------------------------------------------
 */
export const SOCKET_URL: string =
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:4000";

/* ----------------------------------------------------------------------------
 * Shared Socket.IO Client Instance
 * ----------------------------------------------------------------------------
 * Configuration:
 * - path: customize if backend uses a non-default socket.io path
 * - transports: prioritize websocket
 * - autoConnect: manual connection trigger (recommended with auth)
 * - withCredentials: allow sending cookies if needed
 * ----------------------------------------------------------------------------
 */
const socket: Socket = io(SOCKET_URL, {
  path: "/socket",
  transports: ["websocket"],
  autoConnect: false,
  withCredentials: true,
});

/* ----------------------------------------------------------------------------
 * Debug Logging (only in DEV)
 * ----------------------------------------------------------------------------
 */
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

/* ----------------------------------------------------------------------------
 * Export
 * ----------------------------------------------------------------------------
 * Use `socket.connect()` once the user is authenticated (e.g. in `main.tsx`)
 * ----------------------------------------------------------------------------
 */
export default socket;
