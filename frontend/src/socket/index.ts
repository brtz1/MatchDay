// frontend/src/socket/index.ts
import { io, type Socket } from "socket.io-client";

/* Events */
export const SOCKET_EVENTS = {
  MATCH_TICK: "match-tick",
  MATCH_EVENT: "match-event",
  STAGE_CHANGED: "stage-changed",
  JOINED_SAVE: "joined-save",
  LEFT_SAVE: "left-save",
} as const;

/* Payloads */
export type MatchTickPayload = {
  matchId: number;
  minute: number;
  homeGoals?: number; // optional for resilience
  awayGoals?: number; // optional for resilience
  id?: number;        // legacy
};

export type MatchEventPayload = {
  matchId: number;
  minute: number;
  type: string;
  description: string;
  // canonical (if backend sends it)
  saveGamePlayerId?: number;
  // legacy compatibility
  player?: { id: number; name: string } | null;
};

export type StageChangedPayload = {
  gameStage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";
  matchdayNumber?: number;
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
  withCredentials: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000,
});

/* Internal state for auto-rejoin */
let lastJoinedSaveId: number | null = null;

/* Helpers */
type TimeoutAck = { timeout: true; event: string };
function onceEvent<T>(event: string, timeoutMs = 3000): Promise<T | TimeoutAck> {
  return new Promise<T | TimeoutAck>((resolve) => {
    const t = setTimeout(() => {
      socket.off(event, onEvent as unknown as (...args: unknown[]) => void);
      resolve({ timeout: true, event });
    }, timeoutMs);

    function onEvent(payload: T) {
      clearTimeout(t);
      socket.off(event, onEvent as unknown as (...args: unknown[]) => void);
      resolve(payload);
    }

    socket.on(event, onEvent as unknown as (...args: unknown[]) => void);
  });
}

/* Connect/disconnect */
export function connectSocket() {
  // `connecting` flag doesn't exist in socket.io-client types; calling connect() is idempotent.
  if (!socket.connected) socket.connect();
}

/** Optional helper if you want to await the connection from a screen */
export function waitConnected(timeoutMs = 5000): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const t = setTimeout(() => resolve(), timeoutMs);
    socket.once("connect", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

export function disconnectSocket() {
  if (socket.connected) {
    offAllLiveListeners();
    lastJoinedSaveId = null;
    socket.disconnect();
  }
}

/* Rooms */
type JoinAck = { saveGameId: number; room?: string } | { error: string };
type LeaveAck = { saveGameId: number; room?: string } | { error: string };

export async function joinSaveRoom(
  saveGameId: number,
  opts?: { waitAck?: boolean; timeoutMs?: number }
) {
  const n = Number(saveGameId);
  if (!Number.isFinite(n)) return false;

  connectSocket();

  socket.emit("join-save", { saveGameId: n });
  lastJoinedSaveId = n;

  const waitAck = opts?.waitAck ?? true;
  const timeoutMs = opts?.timeoutMs ?? 3000;
  if (!waitAck) return true;

  const ack = await onceEvent<JoinAck>(SOCKET_EVENTS.JOINED_SAVE, timeoutMs);
  if ("timeout" in ack) {
    if (import.meta.env.DEV) {
      console.warn("[socket] join-save ack timed out; proceeding optimistically");
    }
    return true;
  }
  if ("error" in ack) {
    if (import.meta.env.DEV) {
      console.error("[socket] join-save error:", ack.error);
    }
    return false;
  }
  return ack.saveGameId === n;
}

export async function leaveSaveRoom(
  saveGameId: number,
  opts?: { waitAck?: boolean; timeoutMs?: number }
) {
  const n = Number(saveGameId);
  if (!Number.isFinite(n)) return false;

  socket.emit("leave-save", { saveGameId: n });

  const waitAck = opts?.waitAck ?? false; // leaving ack rarely needed
  const timeoutMs = opts?.timeoutMs ?? 2000;

  if (!waitAck) {
    if (lastJoinedSaveId === n) lastJoinedSaveId = null;
    return true;
  }

  const ack = await onceEvent<LeaveAck>(SOCKET_EVENTS.LEFT_SAVE, timeoutMs);
  if ("timeout" in ack) {
    if (import.meta.env.DEV) {
      console.warn("[socket] leave-save ack timed out; proceeding");
    }
    if (lastJoinedSaveId === n) lastJoinedSaveId = null;
    return true;
  }
  if ("error" in ack) {
    if (import.meta.env.DEV) {
      console.error("[socket] leave-save error:", ack.error);
    }
    return false;
  }
  if (lastJoinedSaveId === n) lastJoinedSaveId = null;
  return true;
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

/* Auto-rejoin on reconnect */
socket.on("connect", () => {
  if (import.meta.env.DEV) {
    console.info("[socket] connected:", socket.id);
  }
  if (Number.isFinite(lastJoinedSaveId as unknown as number)) {
    // best-effort rejoin
    socket.emit("join-save", { saveGameId: lastJoinedSaveId });
  }
});

/* Dev logs */
if (import.meta.env.DEV) {
  socket.on("disconnect", (reason) => console.info("[socket] disconnected:", reason));
  socket.on("connect_error", (err) => console.error("[socket] connect_error:", err.message));
  socket.on(SOCKET_EVENTS.JOINED_SAVE, (p) => console.info("[socket] joined-save:", p));
  socket.on(SOCKET_EVENTS.LEFT_SAVE, (p) => console.info("[socket] left-save:", p));
  socket.on(SOCKET_EVENTS.MATCH_TICK, (p) => console.info("[socket] match-tick:", p));
  socket.on(SOCKET_EVENTS.MATCH_EVENT, (p) => console.info("[socket] match-event:", p));
  socket.on(SOCKET_EVENTS.STAGE_CHANGED, (p) => console.info("[socket] stage-changed:", p));
}

export default socket;
