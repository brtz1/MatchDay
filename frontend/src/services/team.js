const API_BASE = 'http://localhost:4000/api/teams';
export const getNextMatch = async (teamId) => {
    const res = await fetch(`${API_BASE}/${teamId}/next-match`);
    return res.json();
};
export const getTeam = async (teamId) => {
    const res = await fetch(`${API_BASE}/${teamId}`);
    return res.json();
};
export const getOpponentInfo = async (teamId) => {
    const res = await fetch(`http://localhost:4000/api/teams/info/${teamId}`);
    return res.json();
};
export const getTeamFinances = async (teamId) => {
    const res = await fetch(`http://localhost:4000/api/teams/${teamId}/finances`);
    return res.json();
};
//# sourceMappingURL=team.js.map