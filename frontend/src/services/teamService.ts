/**
 * teamService.ts
 * --------------
 * REST helpers for team data, schedules, finances, and admin CRUD.
 */

import axios from "@/services/axios";
import { SaveGamePlayer } from "@prisma/client";

/* ------------------------------------------------------------------ Types */

export interface Team {
  id: number;
  name: string;
  country?: string;
  division?: string;
  primaryColor?: string;
  secondaryColor?: string;
  budget?: number;
  stadiumCapacity?: number;
}

export interface TeamWithPlayers extends Team {
  players: SaveGamePlayer[];
  coach?: { name: string; morale: number };
}

export interface MatchLite {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  division: string;
}

export interface Finances {
  balance: number;
  wageBill: number;
  ticketIncome: number;
  transferBudget: number;
}

export interface CreateTeamRequest
  extends Pick<Team, "name" | "country" | "budget"> {}

/* ------------------------------------------------------------------ API */

const BASE = "/teams";
const SAVE_GAME_TEAMS = "/save-game-teams";

/** GET `/teams` — list all teams (admin) */
async function getTeams(): Promise<Team[]> {
  const { data } = await axios.get<Team[]>(BASE);
  return data;
}

/** POST `/teams` — admin create */
async function createTeam(payload: CreateTeamRequest) {
  const { data } = await axios.post<Team>(BASE, payload);
  return data;
}

/** GET `/save-game-teams/{id}` — active save, includes players */
async function getTeamById(id: number): Promise<TeamWithPlayers> {
  const { data } = await axios.get<TeamWithPlayers>(
    `${SAVE_GAME_TEAMS}/${id}`
  );
  return data;
}

/** GET `/save-game-teams/{id}/next-match` */
async function getNextMatch(id: number): Promise<MatchLite> {
  const { data } = await axios.get<MatchLite>(
    `${SAVE_GAME_TEAMS}/${id}/next-match`
  );
  return data;
}

/** GET `/save-game-teams/opponent/{matchId}` */
async function getOpponentInfo(matchId: number): Promise<Team> {
  const { data } = await axios.get<Team>(
    `${SAVE_GAME_TEAMS}/opponent/${matchId}`
  );
  return data;
}

/** GET `/save-game-teams/{id}/finances` */
async function getTeamFinances(id: number): Promise<Finances> {
  const { data } = await axios.get<Finances>(
    `${SAVE_GAME_TEAMS}/${id}/finances`
  );
  return data;
}

/* ------------------------------------------------------------------ Export */

export default {
  getTeams,
  createTeam,
  getTeamById,
  getNextMatch,
  getOpponentInfo,
  getTeamFinances,
};
