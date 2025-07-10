/// src/services/teamService.ts
import api from './api';
/**
 * Fetch full team info including coach, division, etc.
 */
export const getTeamById = async (id) => {
    const res = await api.get(`/teams/${id}`);
    return res.data;
};
/**
 * Get all players for a given team ID
 */
export const getPlayersByTeam = async (id) => {
    const res = await api.get(`/teams/${id}/players`);
    return res.data;
};
/**
 * Get basic financial info for a given team ID
 */
export const getTeamFinances = async (id) => {
    const res = await api.get(`/teams/${id}/finances`);
    return res.data;
};
/**
 * Get the upcoming match for a team
 */
export const getNextMatch = async (id) => {
    const res = await api.get(`/teams/${id}/next-match`);
    return res.data;
};
/**
 * Get details about the current or next opponent
 */
export const getOpponentInfo = async (id) => {
    const res = await api.get(`/teams/${id}/opponent`);
    return res.data;
};
//# sourceMappingURL=teamService.js.map