// frontend/src/services/matchService.ts
import api from "@/services/axios";
/* ------------------------------------------------------------------------- */
/* API Calls                                                                 */
/* ------------------------------------------------------------------------- */
export async function setFormation(matchId, teamId, formation, isHomeTeam) {
    const response = await api.post("/api/match/set-formation", {
        matchId,
        teamId,
        formation,
        isHomeTeam,
    });
    return response.data;
}
export async function getMatches() {
    const response = await api.get("/api/match");
    return response.data;
}
export async function simulateMatch(form) {
    const response = await api.post("/api/match/simulate", form);
    return response.data;
}
/* ------------------------------------------------------------------------- */
/* Export                                                                    */
/* ------------------------------------------------------------------------- */
export default {
    setFormation,
    getMatches,
    simulateMatch,
};
//# sourceMappingURL=matchService.js.map