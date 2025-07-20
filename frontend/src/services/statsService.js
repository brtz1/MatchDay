/**
 * statsService.ts
 * ---------------
 * Endpoints for player–match statistics and league-wide leaderboards.
 */
import axios from "@/services/axios";
/* ------------------------------------------------------------------ API */
const BASE = "/stats";
/** GET `/stats/{playerId}` – all match stats for a player */
async function getPlayerStats(playerId) {
    const { data } = await axios.get(`${BASE}/${playerId}`);
    return data;
}
/** POST `/stats` – record stats for a player in a match */
async function recordPlayerStats(payload) {
    const { data } = await axios.post(BASE, payload);
    return data;
}
/** GET `/stats/top` – league leaders used by TopPlayersPage */
async function getTopPlayers() {
    const { data } = await axios.get(`${BASE}/top`);
    return data;
}
/* ------------------------------------------------------------------ Export */
export default {
    getPlayerStats,
    recordPlayerStats,
    getTopPlayers,
};
//# sourceMappingURL=statsService.js.map