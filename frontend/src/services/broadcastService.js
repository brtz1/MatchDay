/**
 * Broadcast / Live-match helper
 * =============================
 * Wraps Socket.IO + REST endpoints so pages (e.g. MatchdayLivePage,
 * HalfTimePopup) can consume a tidy API instead of importing the socket
 * singleton everywhere.
 */
import axios from "@/services/axios";
import socket from "@/socket";
/* ------------------------------------------------------------------ REST */
export async function getCurrentMatchday() {
    const { data } = await axios.get("/gamestate");
    return data.currentMatchday;
}
export async function getMatchEvents(matchdayId) {
    const { data } = await axios.get(`/match-events/${matchdayId}`);
    return data;
}
/* ---------------------------------------------------------------- SocketIO */
/** Lazy-connect (won’t reconnect if already up) */
export function connectSocket() {
    if (!socket.connected)
        socket.connect();
}
/** Graceful disconnect (e.g. on page unload) */
export function disconnectSocket() {
    if (socket.connected)
        socket.disconnect();
}
/** Join a matchday “room” on the server so we only receive relevant events */
export function joinMatchdayRoom(matchdayId) {
    socket.emit("join-matchday", { matchdayId });
}
/** Leave room when navigating away */
export function leaveMatchdayRoom(matchdayId) {
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
export function onMatchEvent(listener) {
    socket.on("match-event", listener);
    return () => socket.off("match-event", listener);
}
/* ---------------------------------------------------------------- Actions */
/** Emit a substitution command to backend */
export function sendSubstitution(payload) {
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
//# sourceMappingURL=broadcastService.js.map