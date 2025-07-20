/**
 * playersService.ts
 * -----------------
 * REST wrapper for all player-related endpoints.
 */
import axios from "@/services/axios";
/* ------------------------------------------------------------------ API */
const BASE = "/players";
/** GET `/players` – list all players or free agents */
async function getPlayers() {
    const { data } = await axios.get(BASE);
    return data;
}
/** POST `/players` – create a new player */
async function createPlayer(payload) {
    const { data } = await axios.post(BASE, payload);
    return data;
}
/* ------------------------------------------------------------------ Export */
export default {
    getPlayers,
    createPlayer,
};
//# sourceMappingURL=playersService.js.map