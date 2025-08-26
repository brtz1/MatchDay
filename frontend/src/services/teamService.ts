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
  homeTeamName: string;
  awayTeamName: string;
  matchDate: string;
  refereeName?: string | null;
  matchdayNumber?: number;
  matchdayType?: "LEAGUE" | "CUP";
}

/* ------------------------------------------------------------------ Constants */

const SAVE_GAME_TEAMS = "/save-game-teams";

/* ------------------------------------------------------------------ Helpers */

type HttpErrorLike = { response?: { status?: number } };
function getStatus(err: unknown): number | undefined {
  return (err as HttpErrorLike)?.response?.status;
}

/**
 * Normalize any backend payload shape into a flat MatchLite.
 * Supports:
 *  - flat fields: homeTeamId, awayTeamId, homeTeamName, awayTeamName, matchdayNumber, matchdayType
 *  - nested: homeTeam/awayTeam objects, matchday { number, type }, referee { name }
 */
function toMatchLite(raw: any): MatchLite | null {
  if (!raw) return null;

  const homeTeamId =
    raw.homeTeamId ?? raw.homeTeam?.id ?? raw.home?.id ?? null;
  const awayTeamId =
    raw.awayTeamId ?? raw.awayTeam?.id ?? raw.away?.id ?? null;

  // Required fields: if either ID is missing, consider this unusable for links/UI
  if (homeTeamId == null || awayTeamId == null || raw.id == null) {
    console.warn("[teamService] Invalid next-match payload, missing team IDs:", raw);
    return null;
  }

  const homeTeamName =
    raw.homeTeamName ?? raw.homeTeam?.name ?? raw.home?.name ?? "";
  const awayTeamName =
    raw.awayTeamName ?? raw.awayTeam?.name ?? raw.away?.name ?? "";

  const matchdayNumber =
    typeof raw.matchdayNumber === "number"
      ? raw.matchdayNumber
      : typeof raw.matchday?.number === "number"
      ? raw.matchday.number
      : undefined;

  const rawType = raw.matchdayType ?? raw.matchday?.type;
  const matchdayType =
    rawType === "LEAGUE" || rawType === "CUP" ? rawType : undefined;

  const refereeName =
    raw.refereeName ?? raw.referee?.name ?? null;

  // accept a few common date keys, fallback to empty string (keeps type)
  const matchDate =
    raw.matchDate ?? raw.date ?? raw.startAt ?? "";

  return {
    id: Number(raw.id),
    homeTeamId: Number(homeTeamId),
    awayTeamId: Number(awayTeamId),
    homeTeamName: String(homeTeamName),
    awayTeamName: String(awayTeamName),
    matchDate: String(matchDate),
    refereeName: refereeName != null ? String(refereeName) : null,
    matchdayNumber,
    matchdayType,
  };
}

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
  } catch (err: unknown) {
    const status = getStatus(err);
    if (status === 403) {
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
  } catch (err: unknown) {
    const status = getStatus(err);
    if (status === 403) {
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
 * Returns null if there is no upcoming match or payload is incomplete.
 */
export async function getNextMatch(id: number): Promise<MatchLite | null> {
  const { data } = await axios.get<any>(`${SAVE_GAME_TEAMS}/${id}/next-match`);
  const normalized = toMatchLite(data);
  return normalized;
}

/**
 * Fetch next opponent’s public data.
 */
export async function getOpponentInfo(opponentTeamId: number): Promise<Team> {
  const { data } = await axios.get<Team>(`${SAVE_GAME_TEAMS}/opponent/${opponentTeamId}`);
  return data;
}
