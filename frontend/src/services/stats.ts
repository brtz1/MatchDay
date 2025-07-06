const API_BASE = 'http://localhost:4000/api/stats';

export const getPlayerStats = async (playerId: number) => {
  const res = await fetch(`${API_BASE}/${playerId}`);
  return res.json();
};

export const recordPlayerStats = async (stats: {
  playerId: number;
  matchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}) => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stats)
  });
  return res.json();
};
