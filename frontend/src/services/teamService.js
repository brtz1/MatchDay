// frontend/src/services/teamService.ts
import axios from "@/services/axios";
/* ------------------------------------------------------------------ Constants */
const SAVE_GAME_TEAMS = "/save-game-teams";
/* ------------------------------------------------------------------ API */
/**
 * Fetch full team info + players.
 * Auto-selects correct players endpoint depending on coach.
 */
export async function getTeamById(id, coachTeamId) {
    try {
        const [teamRes, playersRes] = await Promise.all([
            axios.get(`${SAVE_GAME_TEAMS}/${id}`),
            getPlayersByTeamId(id, coachTeamId),
        ]);
        return {
            ...teamRes.data,
            players: playersRes,
        };
    }
    catch (err) {
        if (err?.response?.status === 403) {
            console.warn(`403 - Unauthorized access to team ${id}`);
        }
        else {
            console.error("Error fetching team by ID:", err);
        }
        throw err;
    }
}
/**
 * Internal helper — fetches players from either secure or public endpoint.
 */
export async function getPlayersByTeamId(teamId, coachTeamId) {
    try {
        const isCoach = teamId === coachTeamId;
        const route = isCoach
            ? `${SAVE_GAME_TEAMS}/${teamId}/players`
            : `${SAVE_GAME_TEAMS}/${teamId}/players/public`;
        const { data } = await axios.get(route);
        return data;
    }
    catch (err) {
        if (err?.response?.status === 403) {
            console.warn(`403 - Cannot access player list for team ${teamId}`);
            return [];
        }
        else {
            console.error("Error fetching players by team ID:", err);
            throw err;
        }
    }
}
/**
 * Coach-only finance view (secure).
 */
export async function getTeamFinances(id) {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}/${id}/finances`);
    return data;
}
/**
 * Debug: lists all team names and IDs.
 */
export async function getTeams() {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}/debug-list`);
    return data;
}
/**
 * Fetch next match (used by Team Roster).
 */
export async function getNextMatch(id) {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}/${id}/next-match`);
    return data;
}
/**
 * Fetch next opponent’s public data.
 */
export async function getOpponentInfo(opponentTeamId) {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}/opponent/${opponentTeamId}`);
    return data;
}
//# sourceMappingURL=teamService.js.map