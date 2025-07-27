// frontend/src/services/teamService.ts

import axios from "@/services/axios";
import { Backend } from "@/types/backend";

/* ------------------------------------------------------------------ Types */

export type Team = Backend.Team;
export type Player = Backend.Player;

export interface TeamWithPlayers extends Team {
  players: Player[];
}

export interface Finances {
  salaryTotal: number;
  salaryByPlayer: { id: number; name: string; salary: number }[];
}

export interface MatchLite {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  refereeName?: string;
  matchdayNumber?: number;
  matchdayType?: "LEAGUE" | "CUP";
}

/* ------------------------------------------------------------------ Constants */

const SAVE_GAME_TEAMS = "/save-game-teams";

/* ------------------------------------------------------------------ API */

/**
 * Fetch full team info + players.
 * Auto-selects correct players endpoint depending on coach.
 */
export async function getTeamById(id: number, coachTeamId?: number): Promise<TeamWithPlayers> {
  try {
    const [teamRes, playersRes] = await Promise.all([
      axios.get<Team>(`${SAVE_GAME_TEAMS}/${id}`),
      getPlayersByTeamId(id, coachTeamId),
    ]);

    return {
      ...teamRes.data,
      players: playersRes,
    };
  } catch (err: any) {
    if (err?.response?.status === 403) {
      console.warn(`403 - Unauthorized access to team ${id}`);
    } else {
      console.error("Error fetching team by ID:", err);
    }
    throw err;
  }
}

/**
 * Internal helper — fetches players from either secure or public endpoint.
 */
export async function getPlayersByTeamId(teamId: number, coachTeamId?: number): Promise<Player[]> {
  try {
    const isCoach = teamId === coachTeamId;
    const route = isCoach
      ? `${SAVE_GAME_TEAMS}/${teamId}/players`
      : `${SAVE_GAME_TEAMS}/${teamId}/players/public`;

    const { data } = await axios.get<Player[]>(route);
    return data;
  } catch (err: any) {
    if (err?.response?.status === 403) {
      console.warn(`403 - Cannot access player list for team ${teamId}`);
      return [];
    } else {
      console.error("Error fetching players by team ID:", err);
      throw err;
    }
  }
}

/**
 * Coach-only finance view (secure).
 */
export async function getTeamFinances(id: number): Promise<Finances> {
  const { data } = await axios.get<Finances>(`${SAVE_GAME_TEAMS}/${id}/finances`);
  return data;
}

/**
 * Debug: lists all team names and IDs.
 */
export async function getTeams(): Promise<Team[]> {
  const { data } = await axios.get<Team[]>(`${SAVE_GAME_TEAMS}/debug-list`);
  return data;
}

/**
 * Fetch next match (used by Team Roster).
 */
export async function getNextMatch(id: number): Promise<MatchLite> {
  const { data } = await axios.get<MatchLite>(`${SAVE_GAME_TEAMS}/${id}/next-match`);
  return data;
}

/**
 * Fetch next opponent’s public data.
 */
export async function getOpponentInfo(opponentTeamId: number): Promise<Team> {
  const { data } = await axios.get<Team>(`${SAVE_GAME_TEAMS}/opponent/${opponentTeamId}`);
  return data;
}
