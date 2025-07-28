// src/types/index.ts
import type { DivisionTier as PrismaDivisionTier } from "@prisma/client";
// ========== Enums ==========
export type GameStage = 'ACTION' | 'MATCHDAY' | 'HALFTIME' | 'RESULTS' | 'STANDINGS';
export type MatchdayType = 'LEAGUE' | 'CUP';
export type DivisionTier = PrismaDivisionTier;

// ========== Core DTOs (Frontend Responses Only) ==========

export interface PlayerDTO {
  id: number;
  name: string;
  position: 'GK' | 'DF' | 'MF' | 'AT';
  rating: number;
  salary: number;
  behavior: number;
  contractUntil: number;
  nationality: string;
  teamId: number | null;
  teamName: string;
  price: number;
}

export interface SaveGamePlayerDTO {
  id: number;
  saveGameId: number;
  basePlayerId: number;
  name: string;
  position: string;
  rating: number;
  salary: number;
  behavior: number;
  contractUntil: number;
  teamId?: number;
  localIndex?: number;
  nationality?: string;
  teamName?: string;
}

export interface TeamDTO {
  id: number;
  name: string;
  country: string;
  divisionName?: string;
  morale?: number;
  rating: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface MatchEventDTO {
  id: number;
  matchdayId: number;
  matchId: number;
  minute: number;
  eventType: string;
  description: string;
  playerName?: string;
  teamName?: string;
}

export interface LeagueTableDTO {
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

// ========== Minimal Game Metadata ==========

export interface GameStateDTO {
  season: number;
  currentMatchday: number;
  coachTeamId: number;
  currentSaveGameId: number;
  matchdayType: MatchdayType;
  gameStage: GameStage;
}

export interface SaveGameDTO {
  id: number;
  name: string;
  coachName?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Internal Model Transfer Types ==========

export interface SaveGameTeamLite {
  id: number;
  name: string;
  rating: number;
  saveGameId: number;
  baseTeamId: number;
  division: DivisionTier;
  morale: number;
  currentSeason: number;
  localIndex: number;
}
