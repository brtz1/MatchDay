/**
 * Broadcast / Live-match helper
 * =============================
 * Wraps Socket.IO + REST endpoints so pages (e.g. MatchdayLivePage,
 * HalfTimePopup) can consume a tidy API instead of importing the socket
 * singleton everywhere.
 */

import axios from "@/services/axios";
import socket from "@/socket";

/* ------------------------------------------------------------------ Types */

export interface MatchEvent {
  matchId: number;
  description: string;
  minute: number;
  type: string; // "GOAL" | "YELLOW" | etc.
}

/** Returned by GET /gamestate (simplified) */
export interface GameState {
  currentMatchday: number;
}

export interface SubstitutionPayload {
  matchId: number;
  out: number; // player id leaving pitch
  in: number;  // player id entering
}

/* ------------------------------------------------------------------ REST */

export async function getCurrentMatchday(): Promise<number> {
  const { data } = await axios.get<GameState>("/gamestate");
  return data.currentMatchday;
}

export async function getMatchEvents(matchdayId: number) {
  const { data } = await axios.get<MatchEvent[]>(
    `/match-events/${matchdayId}`
  );
  return data;
}

/* ---------------------------------------------------------------- SocketIO */

/** Lazy-connect (won’t reconnect if already up) */
export function connectSocket() {
  if (!socket.connected) socket.connect();
}

/** Graceful disconnect (e.g. on page unload) */
export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

/** Join a matchday “room” on the server so we only receive relevant events */
export function joinMatchdayRoom(matchdayId: number) {
  socket.emit("join-matchday", { matchdayId });
}

/** Leave room when navigating away */
export function leaveMatchdayRoom(matchdayId: number) {
  socket.emit("leave-matchday", { matchdayId });
}

/**
 * Hook-style event subscription
 *
 * ```ts
 * const off = onMatchEvent(ev => console.log(ev));
 * ...
 * off(); // unsubscribe
 * ```
 */
export function onMatchEvent(
  listener: (ev: MatchEvent) => void
): () => void {
  socket.on("match-event", listener);
  return () => socket.off("match-event", listener);
}

/* ---------------------------------------------------------------- Actions */

/** Emit a substitution command to backend */
export function sendSubstitution(payload: SubstitutionPayload) {
  socket.emit("substitution", payload);
}

/* ---------------------------------------------------------------- Exports */

export default {
  connectSocket,
  disconnectSocket,
  joinMatchdayRoom,
  leaveMatchdayRoom,
  onMatchEvent,
  getCurrentMatchday,
  getMatchEvents,
  sendSubstitution,
};
