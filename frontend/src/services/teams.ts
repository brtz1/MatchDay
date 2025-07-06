const API_BASE = 'http://localhost:4000/api/teams';

export const getTeams = async () => {
  const res = await fetch(API_BASE);
  return res.json();
};

export const createTeam = async (team: {
  name: string;
  country: string;
  budget: number;
}) => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(team)
  });
  return res.json();
};
