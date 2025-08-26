/**
 * frontend/src/services/statsService.ts
 * ------------------------------------
 * Endpoints for player–match statistics and league-wide leaderboards.
 */
import axios from "@/services/axios";
const BASE = "/api/stats";
/* ------------------------------------------------------- Player endpoints */
/** GET `/stats/player/:playerId` – per-match stat rows including season */
async function getPlayerStats(playerId) {
    const { data } = await axios.get(`${BASE}/player/${playerId}`);
    return data;
}
/** GET `/stats/player/:playerId/summary` – pre-aggregated totals */
async function getPlayerStatsSummary(playerId) {
    const { data } = await axios.get(`${BASE}/player/${playerId}/summary`);
    return data;
}
/** POST `/stats/player/:playerId` – record a new per-match stat row */
async function recordPlayerStats(playerId, payload) {
    await axios.post(`${BASE}/player/${playerId}`, payload);
}
/** GET `/stats/top` – league leaders used by TopPlayersPage */
async function getTopPlayers() {
    const { data } = await axios.get(`${BASE}/top`);
    return data;
}
/* ------------------------------------------------------------------ Export */
export default {
    getPlayerStats,
    getPlayerStatsSummary,
    recordPlayerStats,
    getTopPlayers,
};
//# sourceMappingURL=statsService.js.map