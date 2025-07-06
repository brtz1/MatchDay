const API_BASE = 'http://localhost:4000/api/players';

export const getPlayers = async () => {
  const res = await fetch(API_BASE);
  return res.json();
};

export const createPlayer = async (player: {
  name: string;
  age: number;
  position: string;
  rating: number;
  value: number;
  salary: number;
  teamId?: number;
}) => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(player)
  });
  return res.json();
};
