import api from './api';
/**
 * Fetches a single team and its players (from saveGameTeam).
 */
export const getTeamById = async (id) => {
    const res = await api.get(`/save-game-teams/${id}`);
    return res.data;
};
/**
 * Fetch the next scheduled match for a team.
 */
export const getNextMatch = async (id) => {
    const res = await api.get(`/save-game-teams/${id}/next-match`);
    return res.data;
};
/**
 * Fetch info about the opponent for a specific match.
 */
export const getOpponentInfo = async (id) => {
    const res = await api.get(`/save-game-teams/opponent/${id}`);
    return res.data;
};
//# sourceMappingURL=teamService.js.map