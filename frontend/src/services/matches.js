const API_BASE = 'http://localhost:4000/api/matches';
export const getMatches = async () => {
    const res = await fetch(API_BASE);
    return res.json();
};
export const simulateMatch = async (match) => {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(match)
    });
    return res.json();
};
//# sourceMappingURL=matches.js.map