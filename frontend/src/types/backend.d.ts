import { Position, DivisionTier, MatchdayType, GameStage } from './enums';

/**
 * Access as `Backend.Team`, `Backend.Player`, `Backend.Match`, etc.
 */
export namespace Backend {
  /* ───────────────────────────────── Players */

  export interface Player {
  id: number;
  name: string;
  nationality: string;
  position: Position;
  rating: number;
  behavior: number;
  salary: number;
  contractUntil: number;
  teamId: number | null;
  teamName: string;
  price: number;

  // Additional frontend-computed fields
  underContract?: boolean; // e.g., true if contractUntil > currentMatchday
  age?: number;            // optional if calculated from birthdate or generated
  value?: number;          // if you use price/value separately
  }

  export interface PlayerStat {
    id: number;
    matchId: number;
    goals: number;
    assists: number;
    yellow: number;
    red: number;
  }

  export interface PlayerFinance {
    id: number;
    playerId: number;
    salary: number;
    contractUntil: number;
  }

  /* ───────────────────────────────── Teams */

  export interface Team {
    id: number;
    name: string;
    country: string;
    morale: number;
    rating: number;
    division: DivisionTier;
    primaryColor: string;
    secondaryColor: string;
    stadiumCapacity?: number;
    players?: Player[];
  }

  /* ───────────────────────────────── Matches */

  export interface Match {
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    played: boolean;
    division: DivisionTier;
    matchdayId: number;
    matchDate: string; // ISO string
    minute?: number;
    matchType: MatchdayType;
  }

  export type MatchEventType =
    | 'GOAL'
    | 'YELLOW'
    | 'RED'
    | 'SUB'
    | 'PENALTY'
    | 'INJURY';

  export interface MatchEvent {
    id: number;
    matchdayId: number;
    matchId: number;
    minute: number;
    eventType: MatchEventType;
    description: string;
    playerName?: string;
    teamName?: string;
  }

  /* ───────────────────────────────── Transfers */

  export interface Transfer {
    id: number;
    playerId: number;
    playerName: string;
    fromTeam: string;
    toTeam: string;
    amount: number;
    date: string; // ISO string
  }

  /* ───────────────────────────────── Game state */

  export interface GameState {
    currentMatchday: number;
    matchdayType: MatchdayType;
    coachTeamId: number | null;
    currentSaveGameId: number;
    gameStage: GameStage;
    timestamp: string; // ISO string
  }
}
