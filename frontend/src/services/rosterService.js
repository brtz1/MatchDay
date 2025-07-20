/**
 * rosterService.ts
 * ----------------
 * Fetches the players belonging to a given team.
 */
import axios from "@/services/axios";
/* ------------------------------------------------------------------ API */
const BASE = "/teams";
/**
 * GET `/teams/{id}/players`
 *
 * ```ts
 * const squad = await rosterService.getTeamPlayers(42);
 * ```
 */
async function getTeamPlayers(teamId) {
    const { data } = await axios.get(`${BASE}/${teamId}/players`);
    return data;
}
/* ------------------------------------------------------------------ Export */
export default {
    getTeamPlayers,
};
//# sourceMappingURL=rosterService.js.map