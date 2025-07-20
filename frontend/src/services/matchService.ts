/**
 * matchService.ts
 * ---------------
 * All match-related endpoints (list, simulate, single-match details, etc.).
 */

import axios from "@/services/axios";
import api from "./axios";

export async function fetchMatchState(matchId: number) {
  const res = await api.get(`/match-state/${matchId}`);
  return res.data;
}

/* ------------------------------------------------------------------ Types */

export interface MatchLite {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
  division?: string;
  matchDate?: string;
}

export interface SimulateMatchRequest {
  homeTeamId: number;
  awayTeamId: number;
  refereeId: number;
  /** Optional: associate simulation with a specific match-day. */
  matchdayId?: number;
}

export interface SimulateMatchResponse {
  matchId: number;
  homeScore: number;
  awayScore: number;
}

/* ------------------------------------------------------------------ API */

const BASE = "/matches";

/** GET `/matches` — list all simulated or scheduled matches. */
async function getMatches(): Promise<MatchLite[]> {
  const { data } = await axios.get<MatchLite[]>(BASE);
  return data;
}

/**
 * Sends formation selection to backend and returns assigned lineup and bench player IDs.
 */
export async function setFormation(
  matchId: number,
  teamId: number,
  formation: string,
  isHomeTeam: boolean
): Promise<{ lineup: number[]; bench: number[] }> {
  const response = await axios.post(`/api/matches/${matchId}/formation`, {
    teamId,
    formation,
    isHomeTeam,
  });

  return response.data;
}

/**
 * POST `/matches/simulate` — run a one-off simulation.
 * Returns the final score & new match record.
 */
async function simulateMatch(payload: SimulateMatchRequest) {
  const { data } = await axios.post<SimulateMatchResponse>(
    `${BASE}/simulate`,
    payload
  );
  return data;
}

/* Optional: details endpoint if you need it later */
async function getMatchById(id: number) {
  const { data } = await axios.get<MatchLite>(`${BASE}/${id}`);
  return data;
}

/* ------------------------------------------------------------------ Export */
export default {
  getMatches,
  simulateMatch,
  getMatchById,
};
