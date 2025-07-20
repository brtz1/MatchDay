/**
 * saveGameService.ts
 * ------------------
 * Wrapper for every “save-game” endpoint:
 *   • list   – GET  /save-game
 *   • create – POST /save-game
 *   • load   – POST /save-game/load
 *   • manual – POST /manual-save
 *
 * Pages can now import these functions instead of sprinkling raw axios calls.
 */
import axios from "@/services/axios";
/* -------------------------------------------------------------------------- */
/* API helpers                                                                */
/* -------------------------------------------------------------------------- */
const BASE = "/save-game";
/**
 * GET `/save-game`
 * @param includeTeams – when true, backend embeds the teams array
 */
async function listSaveGames(includeTeams = false) {
    const { data } = await axios.get(`${BASE}`, {
        params: { includeTeams },
    });
    return data;
}
/**
 * POST `/save-game` – create brand-new save during the draw workflow
 */
async function createNewSave(payload) {
    const { data } = await axios.post(BASE, payload);
    return data;
}
/**
 * POST `/save-game/load` – resume an existing save
 */
async function loadSave(id) {
    const { data } = await axios.post(`${BASE}/load`, { id });
    return data;
}
/**
 * POST `/manual-save` – quick in-season save
 */
async function manualSave(payload) {
    const { data } = await axios.post("/manual-save", payload);
    return data;
}
/* -------------------------------------------------------------------------- */
/* Exports                                                                    */
/* -------------------------------------------------------------------------- */
export default {
    listSaveGames,
    createNewSave,
    loadSave,
    manualSave,
};
//# sourceMappingURL=saveGameService.js.map