/**
 * statsService.ts
 * ---------------
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
}

export interface RecordStatRequest
  extends Omit<PlayerStat, "id"> {
  playerId: number;
  injuries: number;
}

export interface TopPlayerRow {
  id: number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  nationality: string;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

/* ------------------------------------------------------------------ API */

const BASE = "/stats";

/** GET `/stats/{playerId}` – all match stats for a player */
async function getPlayerStats(
  playerId: number
): Promise<PlayerStat[]> {
  const { data } = await axios.get<PlayerStat[]>(
    `${BASE}/${playerId}`
  );
  return data;
}

/** POST `/stats` – record stats for a player in a match */
async function recordPlayerStats(payload: RecordStatRequest) {
  const { data } = await axios.post<PlayerStat>(BASE, payload);
  return data;
}

/** GET `/stats/top` – league leaders used by TopPlayersPage */
async function getTopPlayers(): Promise<TopPlayerRow[]> {
  const { data } = await axios.get<TopPlayerRow[]>(`${BASE}/top`);
  return data;
}

/* ------------------------------------------------------------------ Export */
export default {
  getPlayerStats,
  recordPlayerStats,
  getTopPlayers,
};
