/* eslint-disable @typescript-eslint/no-namespace */

/**
 * backend.d.ts ─ Ambient namespace describing the JSON payloads
 * coming from your REST & Socket.IO endpoints.  Keep it in sync
 * with the server—but avoid importing server-only libraries here.
 */

import { Position } from "./enums";

/**
 * Access as `Backend.Team`, `Backend.MatchEvent`, etc.
 */
export namespace Backend {
  /* ───────────────────────────────── Players */
  export interface Player {
    id: number;
    name: string;
    age: number;
    position: Position;
    rating: number;
    value: number;
    salary: number;
    nationality?: string;
    underContract?: boolean;
    teamId?: number | null;
  }

  /* ───────────────────────────────── Teams */
  export interface Team {
    id: number;
    name: string;
    country?: string;
    division?: string;
    primaryColor?: string;
    secondaryColor?: string;
    budget?: number;
    stadiumCapacity?: number;
    players?: Player[];
    coach?: { name: string; morale: number };
  }

  /* ───────────────────────────────── Matches */
  export interface Match {
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    minute?: number;
    division: string;
    matchDate?: string;      /* ISO 8601 */
  }

  export type MatchEventType =
    | "GOAL"
    | "YELLOW"
    | "RED"
    | "SUB"
    | "PENALTY"
    | "INJURY";

  export interface MatchEvent {
    matchId: number;
    minute: number;
    type: MatchEventType;
    description: string;
  }

  /* ───────────────────────────────── Statistics */
  export interface PlayerStat {
    id: number;
    matchId: number;
    goals: number;
    assists: number;
    yellow: number;
    red: number;
  }

  /* ───────────────────────────────── Transfers */
  export interface Transfer {
    id: number;
    playerId: number;
    playerName: string;
    fromTeam: string;
    toTeam: string;
    amount: number;
    date: string;            /* ISO 8601 */
  }

  /* ───────────────────────────────── Game-state */
  export interface GameState {
    currentMatchday: number;
    coachTeamId?: number;
    saveGameId?: number;
    timestamp: string;       /* ISO 8601 */
  }
}
