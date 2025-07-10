const API_BASE = 'http://localhost:4000/api/stats';
export const getPlayerStats = async (playerId) => {
    const res = await fetch(`${API_BASE}/${playerId}`);
    return res.json();
};
export const recordPlayerStats = async (stats) => {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats)
    });
    return res.json();
};
//# sourceMappingURL=stats.js.map