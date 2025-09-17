// frontend/src/socket/index.ts
import { io } from "socket.io-client";
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
};
/* URL / path */
const RAW_SOCKET_URL = import.meta.env.VITE_SOCKET_URL ??
    (import.meta.env.VITE_API_URL
        ? String(import.meta.env.VITE_API_URL).replace(/\/api$/i, "")
        : undefined) ??
    "http://localhost:4000";
export const SOCKET_URL = String(RAW_SOCKET_URL).replace(/\/+$/, "");
/* Singleton client */
const socket = io(SOCKET_URL, {
    path: "/socket",
    transports: ["websocket"],
    autoConnect: false,
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
});
/** Getter for places that want the raw instance (e.g., GameState store) */
export function getSocket() {
    return socket;
}
/* Internal state for auto-rejoin */
let lastJoinedSaveId = null;
/* NEW: prevent connect() spam */
let connecting = false;
function onceEvent(event, timeoutMs = 3000) {
    return new Promise((resolve) => {
        const t = setTimeout(() => {
            socket.off(event, onEvent);
            resolve({ timeout: true, event });
        }, timeoutMs);
        function onEvent(payload) {
            clearTimeout(t);
            socket.off(event, onEvent);
            resolve(payload);
        }
        socket.on(event, onEvent);
    });
}
/* Connect/disconnect */
export function connectSocket() {
    // Avoid repeated connect() calls when already connected or in flight
    if (socket.connected || connecting)
        return;
    connecting = true;
    socket.connect();
}
/** Optional helper if you want to await the connection from a screen */
export function waitConnected(timeoutMs = 5000) {
    if (socket.connected)
        return Promise.resolve();
    return new Promise((resolve) => {
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
export async function joinSaveRoom(saveGameId, opts) {
    const n = Number(saveGameId);
    if (!Number.isFinite(n))
        return false;
    connectSocket();
    // NEW: already joined to this save? do nothing
    if (lastJoinedSaveId === n) {
        return true;
    }
    socket.emit("join-save", { saveGameId: n });
    lastJoinedSaveId = n;
    const waitAck = opts?.waitAck ?? true;
    const timeoutMs = opts?.timeoutMs ?? 3000;
    if (!waitAck)
        return true;
    const ack = await onceEvent(SOCKET_EVENTS.JOINED_SAVE, timeoutMs);
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
export async function leaveSaveRoom(saveGameId, opts) {
    const n = Number(saveGameId);
    if (!Number.isFinite(n))
        return false;
    // NEW: if we aren't in this save, nothing to do
    if (lastJoinedSaveId !== n) {
        return true;
    }
    socket.emit("leave-save", { saveGameId: n });
    const waitAck = opts?.waitAck ?? false; // leaving ack rarely needed
    const timeoutMs = opts?.timeoutMs ?? 2000;
    if (!waitAck) {
        if (lastJoinedSaveId === n)
            lastJoinedSaveId = null;
        return true;
    }
    const ack = await onceEvent(SOCKET_EVENTS.LEFT_SAVE, timeoutMs);
    if ("timeout" in ack) {
        if (import.meta.env.DEV) {
            console.warn("[socket] leave-save ack timed out; proceeding");
        }
        if (lastJoinedSaveId === n)
            lastJoinedSaveId = null;
        return true;
    }
    if ("error" in ack) {
        if (import.meta.env.DEV) {
            console.error("[socket] leave-save error:", ack.error);
        }
        return false;
    }
    if (lastJoinedSaveId === n)
        lastJoinedSaveId = null;
    return true;
}
/* Listeners */
export function onMatchTick(handler) {
    socket.on(SOCKET_EVENTS.MATCH_TICK, handler);
}
export function offMatchTick(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.MATCH_TICK, handler)
        : socket.off(SOCKET_EVENTS.MATCH_TICK);
}
export function onMatchEvent(handler) {
    socket.on(SOCKET_EVENTS.MATCH_EVENT, handler);
}
export function offMatchEvent(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.MATCH_EVENT, handler)
        : socket.off(SOCKET_EVENTS.MATCH_EVENT);
}
export function onStageChanged(handler) {
    socket.on(SOCKET_EVENTS.STAGE_CHANGED, handler);
}
export function offStageChanged(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.STAGE_CHANGED, handler)
        : socket.off(SOCKET_EVENTS.STAGE_CHANGED);
}
/* ⬇️ PK-specific listener helpers */
export function onPkStart(handler) {
    socket.on(SOCKET_EVENTS.PK_START, handler);
}
export function offPkStart(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.PK_START, handler)
        : socket.off(SOCKET_EVENTS.PK_START);
}
export function onPkAttempt(handler) {
    socket.on(SOCKET_EVENTS.PK_ATTEMPT, handler);
}
export function offPkAttempt(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.PK_ATTEMPT, handler)
        : socket.off(SOCKET_EVENTS.PK_ATTEMPT);
}
export function onPkEnd(handler) {
    socket.on(SOCKET_EVENTS.PK_END, handler);
}
export function offPkEnd(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.PK_END, handler)
        : socket.off(SOCKET_EVENTS.PK_END);
}
export function onPenaltyAwarded(handler) {
    socket.on(SOCKET_EVENTS.PENALTY_AWARDED, handler);
}
export function offPenaltyAwarded(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.PENALTY_AWARDED, handler)
        : socket.off(SOCKET_EVENTS.PENALTY_AWARDED);
}
export function onPenaltyResult(handler) {
    socket.on(SOCKET_EVENTS.PENALTY_RESULT, handler);
}
export function offPenaltyResult(handler) {
    handler
        ? socket.off(SOCKET_EVENTS.PENALTY_RESULT, handler)
        : socket.off(SOCKET_EVENTS.PENALTY_RESULT);
}
/** Remove all live/broadcast listeners (used on disconnect) */
export function offAllLiveListeners() {
    offMatchTick();
    offMatchEvent();
    offStageChanged();
    offPkStart();
    offPkAttempt();
    offPkEnd();
    offPenaltyAwarded();
    offPenaltyResult();
}
/* Auto-rejoin on reconnect */
socket.on("connect", () => {
    connecting = false;
    if (import.meta.env.DEV) {
        console.info("[socket] connected:", socket.id);
    }
    if (Number.isFinite(lastJoinedSaveId)) {
        // best-effort rejoin
        socket.emit("join-save", { saveGameId: lastJoinedSaveId });
    }
});
socket.on("disconnect", () => {
    connecting = false;
});
socket.on("connect_error", () => {
    connecting = false;
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
    socket.on(SOCKET_EVENTS.PAUSE_REQUEST, (p) => console.info("[socket] pause-request:", p));
    // ⬇️ PK logs
    socket.on(SOCKET_EVENTS.PK_START, (p) => console.info("[socket] pk-start:", p));
    socket.on(SOCKET_EVENTS.PK_ATTEMPT, (p) => console.info("[socket] pk-attempt:", p));
    socket.on(SOCKET_EVENTS.PK_END, (p) => console.info("[socket] pk-end:", p));
    socket.on(SOCKET_EVENTS.PENALTY_AWARDED, (p) => console.info("[socket] penalty-awarded:", p));
    socket.on(SOCKET_EVENTS.PENALTY_RESULT, (p) => console.info("[socket] penalty-result:", p));
}
export default socket;
//# sourceMappingURL=index.js.map