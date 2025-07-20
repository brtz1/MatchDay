/**
 * matchService.ts
 * ---------------
 * All match-related endpoints (list, simulate, single-match details, etc.).
 */
import axios from "@/services/axios";
import api from "./axios";
export async function fetchMatchState(matchId) {
    const res = await api.get(`/match-state/${matchId}`);
    return res.data;
}
/* ------------------------------------------------------------------ API */
const BASE = "/matches";
/** GET `/matches` — list all simulated or scheduled matches. */
async function getMatches() {
    const { data } = await axios.get(BASE);
    return data;
}
/**
 * Sends formation selection to backend and returns assigned lineup and bench player IDs.
 */
export async function setFormation(matchId, teamId, formation, isHomeTeam) {
    const response = await axios.post(`/api/matches/${matchId}/formation`, {
        teamId,
        formation,
        isHomeTeam,
    });
    return response.data;
}
/**
 * POST `/matches/simulate` — run a one-off simulation.
 * Returns the final score & new match record.
 */
async function simulateMatch(payload) {
    const { data } = await axios.post(`${BASE}/simulate`, payload);
    return data;
}
/* Optional: details endpoint if you need it later */
async function getMatchById(id) {
    const { data } = await axios.get(`${BASE}/${id}`);
    return data;
}
/* ------------------------------------------------------------------ Export */
export default {
    getMatches,
    simulateMatch,
    getMatchById,
};
//# sourceMappingURL=matchService.js.map