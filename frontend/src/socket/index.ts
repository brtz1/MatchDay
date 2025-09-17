// frontend/src/socket/index.ts
import { io, type Socket } from "socket.io-client";
import type { ManagerOptions, SocketOptions } from "socket.io-client";

/* PK types */
import type {
  PkStartPayload,
  PkAttempt,
  PkEndPayload,
  PenaltyAwardedPayload,
  PenaltyResultPayload,
} from "@/types/pk";

/* Events */
export const SOCKET_EVENTS = {
  MATCH_TICK: "match-tick",
  MATCH_EVENT: "match-event",
  STAGE_CHANGED: "stage-changed",
  JOINED_SAVE: "joined-save",
  LEFT_SAVE: "left-save",
  PAUSE_REQUEST: "pause-request",

  // ⬇️ PK-specific
  PK_START: "pk-start",
  PK_ATTEMPT: "pk-attempt",
  PK_END: "pk-end",
  PENALTY_AWARDED: "penalty-awarded",
  PENALTY_RESULT: "penalty-result",
} as const;

/* Payloads */
export type MatchTickPayload = {
  matchId: number;
  minute: number;
  homeGoals?: number;
  awayGoals?: number;
  phase?: "NORMAL" | "ET" | "PENS";
  id?: number; // legacy
};
export type MatchEventPayload = {
  matchId: number;
  minute: number;
  type: string;
  description: string;
  saveGamePlayerId?: number;
  player?: { id: number; name: string } | null;
  isHomeTeam?: boolean;
};
export type StageChangedPayload = {
  gameStage:
    | "ACTION"
    | "MATCHDAY"
    | "HALFTIME"
    | "RESULTS"
    | "STANDINGS"
    | "PENALTIES";
  matchdayNumber?: number;
};
/** Optional: export pause-request shapes for typed handlers */
export type PauseReason =
  | "INJURY"
  | "GK_INJURY"
  | "GK_RED_NEEDS_GK"
  | "ET_HALF";
export type PauseRequestPayload = {
  matchId: number;
  isHomeTeam: boolean;
  reason: PauseReason;
  player?: { id: number; name: string; position?: string | null; rating?: number };
};

/* URL / path */
const RAW_SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  (import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api$/i, "")
    : undefined) ??
  "http://localhost:4000";

export const SOCKET_URL = String(RAW_SOCKET_URL).replace(/\/+$/, "");

/** Primary path from env (default /socket to match your previous server), plus a fallback. */
const PRIMARY_PATH =
  (import.meta.env.VITE_SOCKET_PATH as string | undefined) ?? "/socket";
const FALLBACK_PATH = PRIMARY_PATH === "/socket" ? "/socket.io" : "/socket";

/* -----------------------------------------------------------------------------
   Listener Registry (so we can recreate the client and reattach handlers)
----------------------------------------------------------------------------- */
type Handler = (...args: unknown[]) => void; // eslint-friendly
const listeners: Record<string, Set<Handler>> = {
  [SOCKET_EVENTS.MATCH_TICK]: new Set(),
  [SOCKET_EVENTS.MATCH_EVENT]: new Set(),
  [SOCKET_EVENTS.STAGE_CHANGED]: new Set(),
  [SOCKET_EVENTS.PAUSE_REQUEST]: new Set(),
  [SOCKET_EVENTS.PK_START]: new Set(),
  [SOCKET_EVENTS.PK_ATTEMPT]: new Set(),
  [SOCKET_EVENTS.PK_END]: new Set(),
  [SOCKET_EVENTS.PENALTY_AWARDED]: new Set(),
  [SOCKET_EVENTS.PENALTY_RESULT]: new Set(),
  // join/leave acks are listened via once(), not tracked here
};

/* -----------------------------------------------------------------------------
   Socket instance + lifecycle
----------------------------------------------------------------------------- */
let currentPath = PRIMARY_PATH;
let triedPathFallback = false;
let lastJoinedSaveId: number | null = null;
let connecting = false;

function baseOptions(path: string): Partial<ManagerOptions & SocketOptions> {
  return {
    path,
    transports: ["websocket", "polling"], // allow fallback if WS cannot upgrade
    autoConnect: false,
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    reconnectionDelayMax: 5000,
    timeout: 7000,
  };
}

/** Create the initial socket *assigned at declaration* to satisfy TS */
let socket: Socket = io(SOCKET_URL, baseOptions(PRIMARY_PATH));

/** Attach all registered handlers to the current socket instance */
function attachAllRegistered() {
  for (const [event, set] of Object.entries(listeners)) {
    for (const fn of set) socket.on(event, fn as Handler);
  }
}

/** Base dev logs */
function wireDevLogs() {
  if (!import.meta.env.DEV) return;
  socket.on("disconnect", (reason) => console.info("[socket] disconnected:", reason));
  socket.on("connect_error", (err) =>
    console.error("[socket] connect_error:", err.message, "(path:", currentPath, ")"),
  );
  socket.on(SOCKET_EVENTS.JOINED_SAVE, (p) => console.info("[socket] joined-save:", p));
  socket.on(SOCKET_EVENTS.LEFT_SAVE, (p) => console.info("[socket] left-save:", p));
  socket.on(SOCKET_EVENTS.MATCH_TICK, (p) => console.info("[socket] match-tick:", p));
  socket.on(SOCKET_EVENTS.MATCH_EVENT, (p) => console.info("[socket] match-event:", p));
  socket.on(SOCKET_EVENTS.STAGE_CHANGED, (p) => console.info("[socket] stage-changed:", p));
  socket.on(SOCKET_EVENTS.PAUSE_REQUEST, (p) => console.info("[socket] pause-request:", p));
  socket.on(SOCKET_EVENTS.PK_START, (p: PkStartPayload) => console.info("[socket] pk-start:", p));
  socket.on(SOCKET_EVENTS.PK_ATTEMPT, (p: PkAttempt) => console.info("[socket] pk-attempt:", p));
  socket.on(SOCKET_EVENTS.PK_END, (p: PkEndPayload) => console.info("[socket] pk-end:", p));
  socket.on(SOCKET_EVENTS.PENALTY_AWARDED, (p: PenaltyAwardedPayload) =>
    console.info("[socket] penalty-awarded:", p),
  );
  socket.on(SOCKET_EVENTS.PENALTY_RESULT, (p: PenaltyResultPayload) =>
    console.info("[socket] penalty-result:", p),
  );
}

function wireBaseLifecycle() {
  socket.on("connect", () => {
    connecting = false;
    triedPathFallback = true; // we have a good path now
    if (import.meta.env.DEV) {
      console.info("[socket] connected:", socket.id, "(path:", currentPath, ")");
    }
    if (Number.isFinite(lastJoinedSaveId as unknown as number)) {
      socket.emit("join-save", { saveGameId: lastJoinedSaveId });
    }
  });
  socket.on("disconnect", () => {
    connecting = false;
  });
  socket.on("connect_error", () => {
    connecting = false;
    // One-time automatic path fallback between /socket and /socket.io
    if (!triedPathFallback) {
      triedPathFallback = true;
      const newPath = currentPath === PRIMARY_PATH ? FALLBACK_PATH : PRIMARY_PATH;
      try {
        if (import.meta.env.DEV) {
          console.warn("[socket] switching path", currentPath, "→", newPath);
        }
        reinitSocket(newPath);
        // best-effort rejoin
        if (Number.isFinite(lastJoinedSaveId as unknown as number)) {
          socket.emit("join-save", { saveGameId: lastJoinedSaveId });
        }
        socket.connect();
      } catch (e) {
        if (import.meta.env.DEV) console.error("[socket] reinit failed:", e);
      }
    }
  });
}

function reinitSocket(newPath: string) {
  // Detach listeners from old instance (do not clear registry)
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {
    /* ignore */
  }
  currentPath = newPath;
  socket = io(SOCKET_URL, baseOptions(newPath));
  wireBaseLifecycle();
  wireDevLogs();
  attachAllRegistered();
}

/* Wire initial instance */
wireBaseLifecycle();
wireDevLogs();
attachAllRegistered();

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
  // Avoid repeated connect() calls when already connected or in flight
  if (socket.connected || connecting) return;
  connecting = true;
  socket.connect();
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
  opts?: { waitAck?: boolean; timeoutMs?: number },
) {
  const n = Number(saveGameId);
  if (!Number.isFinite(n)) return false;

  connectSocket();

  // already joined to this save? do nothing
  if (lastJoinedSaveId === n) return true;

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
    if (import.meta.env.DEV) console.error("[socket] join-save error:", ack.error);
    return false;
  }
  return ack.saveGameId === n;
}

export async function leaveSaveRoom(
  saveGameId: number,
  opts?: { waitAck?: boolean; timeoutMs?: number },
) {
  const n = Number(saveGameId);
  if (!Number.isFinite(n)) return false;

  // if we aren't in this save, nothing to do
  if (lastJoinedSaveId !== n) return true;

  socket.emit("leave-save", { saveGameId: n });

  const waitAck = opts?.waitAck ?? false; // leaving ack rarely needed
  const timeoutMs = opts?.timeoutMs ?? 2000;

  if (!waitAck) {
    if (lastJoinedSaveId === n) lastJoinedSaveId = null;
    return true;
  }

  const ack = await onceEvent<LeaveAck>(SOCKET_EVENTS.LEFT_SAVE, timeoutMs);
  if ("timeout" in ack) {
    if (import.meta.env.DEV) console.warn("[socket] leave-save ack timed out; proceeding");
    if (lastJoinedSaveId === n) lastJoinedSaveId = null;
    return true;
  }
  if ("error" in ack) {
    if (import.meta.env.DEV) console.error("[socket] leave-save error:", ack.error);
    return false;
  }
  if (lastJoinedSaveId === n) lastJoinedSaveId = null;
  return true;
}

/* Listener helpers (registries keep handlers across re-inits) */
export function onMatchTick(handler: (p: MatchTickPayload) => void) {
  listeners[SOCKET_EVENTS.MATCH_TICK].add(handler as Handler);
  socket.on(SOCKET_EVENTS.MATCH_TICK, handler);
}
export function offMatchTick(handler?: (p: MatchTickPayload) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.MATCH_TICK].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.MATCH_TICK, handler);
  } else {
    listeners[SOCKET_EVENTS.MATCH_TICK].clear();
    socket.off(SOCKET_EVENTS.MATCH_TICK);
  }
}

export function onMatchEvent(handler: (p: MatchEventPayload) => void) {
  listeners[SOCKET_EVENTS.MATCH_EVENT].add(handler as Handler);
  socket.on(SOCKET_EVENTS.MATCH_EVENT, handler);
}
export function offMatchEvent(handler?: (p: MatchEventPayload) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.MATCH_EVENT].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.MATCH_EVENT, handler);
  } else {
    listeners[SOCKET_EVENTS.MATCH_EVENT].clear();
    socket.off(SOCKET_EVENTS.MATCH_EVENT);
  }
}

export function onStageChanged(handler: (p: StageChangedPayload) => void) {
  listeners[SOCKET_EVENTS.STAGE_CHANGED].add(handler as Handler);
  socket.on(SOCKET_EVENTS.STAGE_CHANGED, handler);
}
export function offStageChanged(handler?: (p: StageChangedPayload) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.STAGE_CHANGED].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.STAGE_CHANGED, handler);
  } else {
    listeners[SOCKET_EVENTS.STAGE_CHANGED].clear();
    socket.off(SOCKET_EVENTS.STAGE_CHANGED);
  }
}

/* PK listeners */
export function onPkStart(handler: (p: PkStartPayload) => void) {
  listeners[SOCKET_EVENTS.PK_START].add(handler as Handler);
  socket.on(SOCKET_EVENTS.PK_START, handler);
}
export function offPkStart(handler?: (p: PkStartPayload) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.PK_START].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.PK_START, handler);
  } else {
    listeners[SOCKET_EVENTS.PK_START].clear();
    socket.off(SOCKET_EVENTS.PK_START);
  }
}

export function onPkAttempt(handler: (p: PkAttempt) => void) {
  listeners[SOCKET_EVENTS.PK_ATTEMPT].add(handler as Handler);
  socket.on(SOCKET_EVENTS.PK_ATTEMPT, handler);
}
export function offPkAttempt(handler?: (p: PkAttempt) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.PK_ATTEMPT].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.PK_ATTEMPT, handler);
  } else {
    listeners[SOCKET_EVENTS.PK_ATTEMPT].clear();
    socket.off(SOCKET_EVENTS.PK_ATTEMPT);
  }
}

export function onPkEnd(handler: (p: PkEndPayload) => void) {
  listeners[SOCKET_EVENTS.PK_END].add(handler as Handler);
  socket.on(SOCKET_EVENTS.PK_END, handler);
}
export function offPkEnd(handler?: (p: PkEndPayload) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.PK_END].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.PK_END, handler);
  } else {
    listeners[SOCKET_EVENTS.PK_END].clear();
    socket.off(SOCKET_EVENTS.PK_END);
  }
}

export function onPenaltyAwarded(handler: (p: PenaltyAwardedPayload) => void) {
  listeners[SOCKET_EVENTS.PENALTY_AWARDED].add(handler as Handler);
  socket.on(SOCKET_EVENTS.PENALTY_AWARDED, handler);
}
export function offPenaltyAwarded(handler?: (p: PenaltyAwardedPayload) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.PENALTY_AWARDED].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.PENALTY_AWARDED, handler);
  } else {
    listeners[SOCKET_EVENTS.PENALTY_AWARDED].clear();
    socket.off(SOCKET_EVENTS.PENALTY_AWARDED);
  }
}

export function onPenaltyResult(handler: (p: PenaltyResultPayload) => void) {
  listeners[SOCKET_EVENTS.PENALTY_RESULT].add(handler as Handler);
  socket.on(SOCKET_EVENTS.PENALTY_RESULT, handler);
}
export function offPenaltyResult(handler?: (p: PenaltyResultPayload) => void) {
  if (handler) {
    listeners[SOCKET_EVENTS.PENALTY_RESULT].delete(handler as Handler);
    socket.off(SOCKET_EVENTS.PENALTY_RESULT, handler);
  } else {
    listeners[SOCKET_EVENTS.PENALTY_RESULT].clear();
    socket.off(SOCKET_EVENTS.PENALTY_RESULT);
  }
}

/** Remove all live/broadcast listeners (used on disconnect) */
export function offAllLiveListeners() {
  for (const [event, set] of Object.entries(listeners)) {
    set.clear();
    socket.off(event);
  }
}

/** Getter for places that want the raw instance (e.g., GameState store) */
export function getSocket(): Socket {
  return socket;
}

export default socket;
