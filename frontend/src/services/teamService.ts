// frontend/src/services/teamService.ts

import axios from '@/services/axios';
import { Backend } from '@/types/backend';

/* ------------------------------------------------------------------ Types */

export type Team = Backend.Team;
export type Player = Backend.Player;

export interface TeamWithPlayers extends Team {
  players: Player[];
}

interface MatchLite {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  refereeName?: string;
  matchdayNumber?: number;
  matchdayType?: "LEAGUE" | "CUP";
}


export interface Finances {
  salaryTotal: number;
  salaryByPlayer: { id: number; name: string; salary: number }[];
}

/* ------------------------------------------------------------------ API */

const SAVE_GAME_TEAMS = '/save-game-teams';

export async function getTeamById(id: number): Promise<TeamWithPlayers> {
  const [teamRes, playersRes] = await Promise.all([
    axios.get<Team>(`${SAVE_GAME_TEAMS}/${id}`),
    axios.get<Player[]>(`${SAVE_GAME_TEAMS}/${id}/players`),
  ]);

  return {
    ...teamRes.data,
    players: playersRes.data,
  };
}

export async function getNextMatch(id: number): Promise<MatchLite> {
  const { data } = await axios.get<MatchLite>(
    `${SAVE_GAME_TEAMS}/${id}/next-match`
  );
  return data;
}

export async function getOpponentInfo(opponentTeamId: number): Promise<Team> {
  const { data } = await axios.get<Team>(
    `${SAVE_GAME_TEAMS}/opponent/${opponentTeamId}`
  );
  return data;
}

export async function getTeamFinances(id: number): Promise<Finances> {
  const { data } = await axios.get<Finances>(
    `${SAVE_GAME_TEAMS}/${id}/finances`
  );
  return data;
}

export async function getTeams(): Promise<Team[]> {
  const { data } = await axios.get<Team[]>(`${SAVE_GAME_TEAMS}`);
  return data;
}
