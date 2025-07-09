// src/services/teamService.ts
import api from './api';
import { Team, Player, Finance, Match } from '@/types';

export const getTeamById = async (id: number): Promise<Team> => {
  const res = await api.get(`/teams/${id}`);
  return res.data;
};

export const getPlayersByTeam = async (id: number): Promise<Player[]> => {
  const res = await api.get(`/teams/${id}/players`);
  return res.data;
};

export const getTeamFinances = async (id: number): Promise<Finance[]> => {
  const res = await api.get(`/teams/${id}/finances`);
  return res.data;
};

export const getNextMatch = async (id: number): Promise<Match> => {
  const res = await api.get(`/teams/${id}/next-match`);
  return res.data;
};

export const getOpponentInfo = async (id: number): Promise<Team> => {
  const res = await api.get(`/teams/${id}/opponent`);
  return res.data;
};
