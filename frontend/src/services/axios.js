import axios, { isAxiosError } from "axios";
const META = import.meta;
const RAW_BASE = META.env?.VITE_API_URL ||
    (typeof window !== "undefined" ? window.__API_URL__ : undefined) ||
    "http://localhost:4000";
const BASE_URL = `${String(RAW_BASE).replace(/\/+$/, "")}/api`;
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
});
/* ----------------------------------------------------------------------------
   Request Interceptor
   - Inject Bearer token
   - Normalize URLs so accidental `/api/...` in calls won’t double prefix
---------------------------------------------------------------------------- */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof config.url === "string") {
        let url = config.url;
        // Ensure leading slash
        if (!url.startsWith("/"))
            url = `/${url}`;
        // Strip accidental `/api/` prefix
        if (url.startsWith("/api/"))
            url = url.replace(/^\/api/, "");
        config.url = url;
    }
    return config;
}, (error) => Promise.reject(error));
/* ----------------------------------------------------------------------------
   Response Interceptor (dev logging)
---------------------------------------------------------------------------- */
api.interceptors.response.use((res) => res, (err) => {
    if (import.meta.env.DEV) {
        console.error("[axios]", err.response ?? err.message);
    }
    return Promise.reject(err);
});
/* ============================================================================
   Centralized API Wrappers
   (Grouped roughly by feature area)
============================================================================ */
/* -- Game State ------------------------------------------------------------ */
export async function getGameState() {
    const { data } = await api.get("/gamestate");
    return data;
}
export async function setStage(payload) {
    const res = await api.post("/matchday/set-stage", payload);
    if (!res.data?.gameStage)
        throw new Error("set-stage returned no gameStage");
    return res.data;
}
/* -- Formation / Coach XI -------------------------------------------------- */
/** POST /formation/coach — persist confirmed XI exactly as chosen on FE. */
export async function postCoachFormation(payload) {
    const { data } = await api.post("/formation/coach", payload);
    return data ?? { ok: true };
}
/* -- Matchday Flow --------------------------------------------------------- */
export async function advanceMatchday(payload) {
    const { data } = await api.post("/matchday/advance", payload);
    return data;
}
/**
 * RESULTS -> STANDINGS (used after matches end).
 * Backend: POST /matchday/advance-after-results { saveGameId }
 */
export async function advanceAfterResults(saveGameId) {
    const { data } = await api.post("/matchday/advance-after-results", { saveGameId });
    return data;
}
export async function getTeamMatchInfo(arg1, arg2, arg3) {
    const params = typeof arg1 === "number"
        ? { saveGameId: arg1, matchday: arg2, teamId: arg3 }
        : arg1;
    const { data } = await api.get("/matchday/team-match-info", { params });
    return data;
}
/* -- Live Matches + Events ------------------------------------------------- */
export async function getMatchesByMatchday(matchday) {
    const { data } = await api.get("/matches", { params: { matchday } });
    return data ?? [];
}
/** GET /match-events/by-matchday/:number → { [matchId]: MatchEventDTO[] } */
export async function getMatchEventsByMatchday(matchdayNumber) {
    const { data } = await api.get(`/match-events/by-matchday/${matchdayNumber}`);
    return data ?? {};
}
/** GET /matchstate/:matchId?side=home|away */
export async function getMatchState(matchId, side) {
    const { data } = await api.get(`/matchstate/${matchId}`, { params: { side } });
    return data;
}
/** POST /matchstate/:matchId/substitute  (aligned with backend route) */
export async function postSubstitution(matchId, payload) {
    const { data } = await api.post(`/matchstate/${matchId}/substitute`, payload);
    return data;
}
export async function getSaveGameTeamById(teamId) {
    const { data } = await api.get(`/save-game-teams/${teamId}`);
    return data;
}
/* -- Standings / Results / Cup -------------------------------------------- */
/**
 * Grouped standings that match backend `/standings` & `/standings/current`
 *     -> returns array of divisions with their ordered rows
 */
export async function getCurrentStandings(saveGameId) {
    const params = saveGameId ? { saveGameId } : undefined;
    const { data } = await api.get("/standings/current", { params });
    return data ?? [];
}
export async function finalizeStandings(saveGameId) {
    const payload = saveGameId ? { saveGameId } : {};
    const { data } = await api.post("/standings/finalize", payload);
    return data;
}
export async function getResultsByMatchday(matchday) {
    const { data } = await api.get("/matches/results", { params: { matchday } });
    return data;
}
/** Cup log/bracket — leave response shape generic for now */
export async function getCupLog() {
    const { data } = await api.get("/cup/log");
    return data;
}
export async function listSaveGames() {
    const { data } = await api.get("/save-game");
    return data ?? [];
}
// Leave details generic to avoid `any` and let the caller specify the shape if needed.
export async function getSaveGame(id) {
    const { data } = await api.get(`/save-game/${id}`);
    return data;
}
export async function createSaveGame(payload) {
    const { data } = await api.post("/save-game", payload);
    return data;
}
/* ============================================================================
   Utilities
============================================================================ */
export function setAuthToken(token) {
    if (token)
        localStorage.setItem("token", token);
    else
        localStorage.removeItem("token");
}
export function getApiBaseUrl() {
    return BASE_URL;
}
export { isAxiosError };
export default api;
//# sourceMappingURL=axios.js.map