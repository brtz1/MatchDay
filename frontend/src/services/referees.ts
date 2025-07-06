const API_BASE = 'http://localhost:4000/api/referees';

export const getReferees = async () => {
  const res = await fetch(API_BASE);
  return res.json();
};