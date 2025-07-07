import axios from "axios";

const API_URL = "/api/matches";

export const getMatches = async () => {
  const res = await axios.get(API_URL);
  return res.data;
};

export const simulateMatch = async (data: {
  homeTeamId: number;
  awayTeamId: number;
  matchdayId: number;
  refereeId: number;
}) => {
  const res = await axios.post(`${API_URL}/simulate`, data);
  return res.data;
};
