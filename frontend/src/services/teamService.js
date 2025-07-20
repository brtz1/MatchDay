// frontend/src/services/teamService.ts
import axios from '@/services/axios';
/* ------------------------------------------------------------------ API */
const SAVE_GAME_TEAMS = '/save-game-teams';
export async function getTeamById(id) {
    const [teamRes, playersRes] = await Promise.all([
        axios.get(`${SAVE_GAME_TEAMS}/${id}`),
        axios.get(`${SAVE_GAME_TEAMS}/${id}/players`),
    ]);
    return {
        ...teamRes.data,
        players: playersRes.data,
    };
}
export async function getNextMatch(id) {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}/${id}/next-match`);
    return data;
}
export async function getOpponentInfo(opponentTeamId) {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}/opponent/${opponentTeamId}`);
    return data;
}
export async function getTeamFinances(id) {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}/${id}/finances`);
    return data;
}
export async function getTeams() {
    const { data } = await axios.get(`${SAVE_GAME_TEAMS}`);
    return data;
}
//# sourceMappingURL=teamService.js.map