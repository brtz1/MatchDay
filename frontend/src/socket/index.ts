// frontend/src/socket/index.ts
import { io, type Socket } from "socket.io-client";

/* Events */
export const SOCKET_EVENTS = {
  MATCH_TICK: "match-tick",
  MATCH_EVENT: "match-event",
  STAGE_CHANGED: "stage-changed",
} as const;

/* Payloads */
export type MatchTickPayload = {
  matchId: number;
  minute: number;
  homeGoals: number;
  awayGoals: number;
};
export type MatchEventPayload = {
  matchId: number;
  minute: number;
  type: string;
  description: string;
  player?: { id: number; name: string } | null;
};
export type StageChangedPayload = {
  gameStage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";
};

/* URL / path */
const RAW_SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  (import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api$/i, "")
    : undefined) ??
  "http://localhost:4000";

export const SOCKET_URL = String(RAW_SOCKET_URL).replace(/\/+$/, "");

/* Singleton client */
const socket: Socket = io(SOCKET_URL, {
  path: "/socket",
  transports: ["websocket"],
  autoConnect: false,
  withCredentials: false, // ← simpler unless you truly use cookies
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000,
});

/* Connect/disconnect */
export function connectSocket() {
  if (!socket.connected) socket.connect();
}
export function disconnectSocket() {
  if (socket.connected) {
    offAllLiveListeners();
    socket.disconnect();
  }
}

/* Rooms */
export function joinSaveRoom(saveGameId: number) {
  if (typeof saveGameId === "number") socket.emit("join-save", { saveGameId });
}
export function leaveSaveRoom(saveGameId: number) {
  if (typeof saveGameId === "number") socket.emit("leave-save", { saveGameId });
}

/* Listeners */
export function onMatchTick(handler: (p: MatchTickPayload) => void) {
  socket.on(SOCKET_EVENTS.MATCH_TICK, handler);
}
export function offMatchTick(handler?: (p: MatchTickPayload) => void) {
  handler ? socket.off(SOCKET_EVENTS.MATCH_TICK, handler) : socket.off(SOCKET_EVENTS.MATCH_TICK);
}
export function onMatchEvent(handler: (p: MatchEventPayload) => void) {
  socket.on(SOCKET_EVENTS.MATCH_EVENT, handler);
}
export function offMatchEvent(handler?: (p: MatchEventPayload) => void) {
  handler ? socket.off(SOCKET_EVENTS.MATCH_EVENT, handler) : socket.off(SOCKET_EVENTS.MATCH_EVENT);
}
export function onStageChanged(handler: (p: StageChangedPayload) => void) {
  socket.on(SOCKET_EVENTS.STAGE_CHANGED, handler);
}
export function offStageChanged(handler?: (p: StageChangedPayload) => void) {
  handler ? socket.off(SOCKET_EVENTS.STAGE_CHANGED, handler) : socket.off(SOCKET_EVENTS.STAGE_CHANGED);
}
export function offAllLiveListeners() {
  offMatchTick();
  offMatchEvent();
  offStageChanged();
}

/* Dev logs */
if (import.meta.env.DEV) {
  socket.on("connect", () => console.info("[socket] connected:", socket.id));
  socket.on("disconnect", (reason) => console.info("[socket] disconnected:", reason));
  socket.on("connect_error", (err) => console.error("[socket] connect_error:", err.message));
}

export default socket;
