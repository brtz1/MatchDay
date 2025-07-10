/// src/services/teamService.ts
import api from './api';
import { Team, Player, Finance, Match } from '../types';

/**
 * Fetch full team info including coach, division, etc.
 */
export const getTeamById = async (id: number): Promise<Team> => {
  const res = await api.get(`/teams/${id}`);
  return res.data;
};

/**
 * Get all players for a given team ID
 */
export const getPlayersByTeam = async (id: number): Promise<Player[]> => {
  const res = await api.get(`/teams/${id}/players`);
  return res.data;
};

/**
 * Get basic financial info for a given team ID
 */
export const getTeamFinances = async (id: number): Promise<Finance> => {
  const res = await api.get(`/teams/${id}/finances`);
  return res.data;
};

/**
 * Get the upcoming match for a team
 */
export const getNextMatch = async (id: number): Promise<Match> => {
  const res = await api.get(`/teams/${id}/next-match`);
  return res.data;
};

/**
 * Get details about the current or next opponent
 */
export const getOpponentInfo = async (id: number): Promise<Team> => {
  const res = await api.get(`/teams/${id}/opponent`);
  return res.data;
};
