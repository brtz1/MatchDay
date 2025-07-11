// src/types/index.ts

// Enums
export type GameStage = 'ACTION' | 'MATCHDAY' | 'HALFTIME' | 'RESULTS' | 'STANDINGS';
export type MatchdayType = 'LEAGUE' | 'CUP';
export type DivisionTier = 'D1' | 'D2' | 'D3' | 'D4';

// Core Models
export interface Division {
  id: number;
  name: string;
  level: number;
}

export interface Coach {
  id: number;
  name: string;
  teamId?: number;
  morale: number;
  contractWage: number;
  contractUntil: number;
}

export interface Matchday {
  id: number;
  number: number;
  type: MatchdayType;
  date: string; // ISO string
  isPlayed: boolean;
}

export interface MatchEvent {
  id: number;
  matchdayId: number;
  matchId: number;
  minute: number;
  eventType: string;
  description: string;
  playerId?: number;
}

export interface Match {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore?: number;
  awayScore?: number;
  matchDate: string;
  season: number;
  isPlayed: boolean;
  matchdayId: number;
}

export interface PlayerMatchStats {
  id: number;
  playerId: number;
  matchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

export interface Transfer {
  id: number;
  playerId: number;
  fromTeamId?: number;
  toTeamId: number;
  fee: number;
  date: string;
}

export interface Finance {
  id: number;
  teamId: number;
  amount: number;
  type: string;
  reason: string;
  date: string;
}

export interface LeagueTable {
  id: number;
  teamId: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Referee {
  id: number;
  name: string;
  country: string;
  strictness: number;
}

export interface Team {
  id: number;
  name: string;
  country: string;
  divisionId?: number;
  stadiumSize: number;
  ticketPrice: number;
  rating: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface Player {
  id: number;
  name: string;
  nationality: string;
  position: string;
  rating: number;
  salary: number;
  behavior: number;
  contractUntil?: number;
  teamId?: number;
  lockedUntilNextMatchday: boolean;
}

// Save-Game Models
export interface SaveGame {
  id: number;
  name: string;
  coachName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveGameTeam {
  id: number;
  saveGameId: number;
  baseTeamId: number;
  name: string;
  division: DivisionTier;
  morale: number;
  currentSeason: number;
  localIndex?: number;
}

export interface SaveGamePlayer {
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
}

export interface SaveGameMatch {
  id: number;
  saveGameId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore?: number;
  awayScore?: number;
  matchDate: string;
  played: boolean;
  matchdayId?: number;
}

export interface GameState {
  id: number;
  season: number;
  currentMatchday: number;
  coachTeamId: number;
  currentSaveGameId: number;
  matchdayType: MatchdayType;
  gameStage: GameStage;
}

export interface MatchState {
  id: number;
  matchId: number;
  homeLineup: number[];
  awayLineup: number[];
  homeReserves: number[];
  awayReserves: number[];
  homeSubsMade: number;
  awaySubsMade: number;
  isPaused: boolean;
}
