// frontend/src/services/matchService.ts
import api from "@/services/axios";
/** Optional helper if you expose this in your axios service */
async function fetchTeamMatchInfo(saveGameId, matchday, teamId) {
    const { data } = await api.get("/matchday/team-match-info", { params: { saveGameId, matchday, teamId } });
    return data;
}
/**
 * Persist the user's selection. Tries the new coach endpoint first, then falls back to the legacy per-match route.
 */
export async function saveCoachSelection(params) {
    const { saveGameId, matchday, coachTeamId, formation, lineupIds, reserveIds } = params;
    // 1) Preferred (new) route: save by saveGameId (no need for matchId/isHomeTeam)
    try {
        await api.post("/formation/coach", {
            saveGameId,
            formation,
            lineupIds,
            reserveIds,
        });
        return;
    }
    catch (e) {
        // fall back below
        console.warn("[FE-matchService] /formation/coach not available; falling back to per-match route", e);
    }
    // 2) Legacy route requires matchId + isHomeTeam
    const info = await fetchTeamMatchInfo(saveGameId, matchday, coachTeamId);
    await api.post(`/matches/${info.matchId}/formation`, {
        formation,
        isHomeTeam: info.isHomeTeam,
        lineupIds,
        reserveIds,
    });
}
/** Advance into MATCHDAY (engine will be started on backend) */
export async function advanceToMatchday(saveGameId) {
    await api.post("/matchday/advance", { saveGameId });
}
//# sourceMappingURL=matchService.js.map