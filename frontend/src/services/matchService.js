// frontend/src/services/matchService.ts
import api from "@/services/axios";
/** Optional helper if you expose this in your axios service */
async function fetchTeamMatchInfo(saveGameId, matchday, teamId) {
    // BE route returns only { matchId, isHomeTeam }
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
        // eslint-disable-next-line no-console
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
/**
 * Advance into MATCHDAY (engine will be started on backend).
 * Backward-compatible:
 *   - advanceToMatchday(42)
 *   - advanceToMatchday({ saveGameId: 42, formation, lineupIds, reserveIds })
 */
export async function advanceToMatchday(arg) {
    const payload = typeof arg === "number"
        ? { saveGameId: arg }
        : {
            saveGameId: arg.saveGameId,
            formation: arg.formation,
            lineupIds: arg.lineupIds,
            reserveIds: arg.reserveIds,
        };
    const { data } = await api.post("/matchday/advance", payload);
    return data;
}
/** Get all events for a given matchday, grouped by matchId. */
export async function getMatchEventsByMatchday(matchdayNumber) {
    const { data } = await api.get(`/match-events/by-matchday/${matchdayNumber}`);
    return data ?? {};
}
/** Get events for a single match (SaveGameMatch.id). */
export async function getMatchEventsByMatchId(matchId) {
    const { data } = await api.get(`/match-events/${matchId}`);
    return data ?? [];
}
//# sourceMappingURL=matchService.js.map