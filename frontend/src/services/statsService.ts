/**
 * frontend/src/services/statsService.ts
 * ------------------------------------
 * Endpoints for player–match statistics and league-wide leaderboards.
 */

import axios from "@/services/axios";

/* ------------------------------------------------------------------ Types */

export interface PlayerStat {
  id: number;
  matchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  injuries: number;
  /** season when the match was played (comes from Matchday.season) */
  season: number;
}

export interface PlayerStatsSummary {
  gamesPlayed: number;
  goals: number;
  goalsThisSeason: number;
  redCards: number;
  injuries: number;
  /** current season used to compute goalsThisSeason */
  season: number;
}

export interface TopPlayerRow {
  playerId: number;
  name: string;
  teamName: string;
  goals: number;
}

const BASE = "/api/stats";

/* ------------------------------------------------------- Player endpoints */

/** GET `/stats/player/:playerId` – per-match stat rows including season */
async function getPlayerStats(playerId: number): Promise<PlayerStat[]> {
  const { data } = await axios.get<PlayerStat[]>(`${BASE}/player/${playerId}`);
  return data;
}

/** GET `/stats/player/:playerId/summary` – pre-aggregated totals */
async function getPlayerStatsSummary(playerId: number): Promise<PlayerStatsSummary> {
  const { data } = await axios.get<PlayerStatsSummary>(`${BASE}/player/${playerId}/summary`);
  return data;
}

/** POST `/stats/player/:playerId` – record a new per-match stat row */
async function recordPlayerStats(playerId: number, payload: Partial<PlayerStat>) {
  await axios.post(`${BASE}/player/${playerId}`, payload);
}

/** GET `/stats/top` – league leaders used by TopPlayersPage */
async function getTopPlayers(): Promise<TopPlayerRow[]> {
  const { data } = await axios.get<TopPlayerRow[]>(`${BASE}/top`);
  return data;
}

/* ------------------------------------------------------------------ Export */
export default {
  getPlayerStats,
  getPlayerStatsSummary,
  recordPlayerStats,
  getTopPlayers,
};