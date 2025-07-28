import api from "@/services/axios";
/* ------------------------------------------------------------------------- */
/* API Calls                                                                 */
/* ------------------------------------------------------------------------- */
export async function setFormation(matchId, teamId, formation, isHomeTeam) {
    const response = await api.post(`/matches/${matchId}/formation`, {
        teamId,
        formation,
        isHomeTeam,
    });
    return response.data;
}
export async function getMatches() {
    const response = await api.get("/matches");
    return response.data;
}
export async function simulateMatch(matchId) {
    const response = await api.post(`/matches/${matchId}/simulate`);
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