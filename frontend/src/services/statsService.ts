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

export type GoldenBootScope = 'all' | 'league' | 'cup';

export interface GoldenBootRow {
  rank: number;
  saveGamePlayerId: number;
  name: string;
  teamId: number | null;
  teamName: string | null;
  position: 'GK'|'DF'|'MF'|'AT'|null;
  goals: number;
}

export interface SeasonGoldenBootResponse {
  saveGameId: number;
  season: number | null;
  scope: GoldenBootScope;
  top: GoldenBootRow[]; // may be [] if no scorers yet
}

export interface GoldenBootHistoryResponse {
  saveGameId: number;
  scope: GoldenBootScope;
  top: GoldenBootRow[]; // may be [] if no scorers yet
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

/* ------------------------------------------- Golden Boot (new endpoints) */

async function getSeasonGoldenBoot(params: {
  saveGameId: number;
  season?: number;
  scope?: GoldenBootScope;
  limit?: number;
}): Promise<SeasonGoldenBootResponse> {
  const { data } = await axios.get<SeasonGoldenBootResponse>(`/api/golden-boot/season`, {
    params,
  });
  return data;
}

async function getGoldenBootHistory(params: {
  saveGameId: number;
  scope?: GoldenBootScope;
  limit?: number;
}): Promise<GoldenBootHistoryResponse> {
  const { data } = await axios.get<GoldenBootHistoryResponse>(`/api/golden-boot/history`, {
    params,
  });
  return data;
}

/* ------------------------------------------------------------------ Export */
export default {
  getPlayerStats,
  getPlayerStatsSummary,
  recordPlayerStats,
  getTopPlayers,
  getSeasonGoldenBoot,
  getGoldenBootHistory,
};
