const API_BASE = 'http://localhost:4000/api/teams';
export const getTeamPlayers = async (teamId) => {
    const res = await fetch(`${API_BASE}/${teamId}/players`);
    if (!res.ok) {
        throw new Error("Failed to fetch players");
    }
    return res.json();
};
//# sourceMappingURL=roster.js.map