import api from './api';
import { Team, Match } from '../types';

/**
 * Fetches a single team and its players (from saveGameTeam).
 */
export const getTeamById = async (id: number): Promise<Team> => {
  const res = await api.get(`/save-game-teams/${id}`);
  return res.data;
};

/**
 * Fetch the next scheduled match for a team.
 */
export const getNextMatch = async (id: number): Promise<Match> => {
  const res = await api.get(`/save-game-teams/${id}/next-match`);
  return res.data;
};

/**
 * Fetch info about the opponent for a specific match.
 */
export const getOpponentInfo = async (id: number): Promise<Team> => {
  const res = await api.get(`/save-game-teams/opponent/${id}`);
  return res.data;
};
