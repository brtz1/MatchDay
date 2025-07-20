/**
 * gameState.ts
 * ------------
 * Consolidates all “game-level” REST calls — current match-day, manual saves,
 * load existing saves, etc.  Pages can import these helpers instead of
 * sprinkling raw axios calls everywhere.
 */
import axios from "@/services/axios";
/* ------------------------------------------------------------------ API */
export async function getGameState() {
    const { data } = await axios.get("/gamestate");
    return data;
}
export async function manualSave(payload) {
    const { data } = await axios.post("/manual-save", payload);
    return data;
}
export async function loadSave(request) {
    const { data } = await axios.post("/save-game/load", request);
    return data;
}
export async function createNewSave(request) {
    const { data } = await axios.post("/save-game", request);
    return data;
}
/* ------------------------------------------------------------------ Export */
export default {
    getGameState,
    manualSave,
    loadSave,
    createNewSave,
};
//# sourceMappingURL=gameStateService.js.map