// frontend/src/types/index.ts

export interface SaveGamePlayer {
  id: number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
  salary: number;
  behavior: number;
  contractUntil: number;
  localIndex: number;
  basePlayerId?: number;
  nationality?: string; // Optional if needed for search filters
  teamId?: number;       // Foreign key to SaveGameTeam
  saveGameId?: number;
}

export interface SaveGameCoach {
  id: number;
  name: string;
  level: number;
  morale: number;
}

export interface SaveGameDivision {
  id: number;
  name: string; // e.g. "Division 1"
  level: number; // 1–4
}

export interface SaveGameTeam {
  id: number;
  name: string;
  baseTeamId: number;
  morale: number;
  division: "D1" | "D2" | "D3" | "D4";
  currentSeason: number;
  localIndex: number;
  saveGameId: number;

  // Optional frontend display
  country?: string;
  primaryColor?: string;
  secondaryColor?: string;

  // Optional computed/stored fields
  stadiumSize?: number;
  ticketPrice?: number;
  rating?: number;
  coach?: SaveGameCoach;
  players?: SaveGamePlayer[];
}

export interface GameState {
  currentSaveGameId: number;
  currentTeamId: number;
  gameStage: 'ACTION' | 'MATCHDAY' | 'HALFTIME' | 'RESULTS' | 'STANDINGS';
  currentMatchday: number;
  matchdayType: 'LEAGUE' | 'CUP';
}

export interface SaveGameMatch {
  id: number;
  matchDate: string;
  isPlayed: boolean;
  homeTeamId: number;
  awayTeamId: number;
  saveGameId: number;

  homeTeam?: SaveGameTeam;
  awayTeam?: SaveGameTeam;

  matchday?: {
    id: number;
    name: string;
    type: 'LEAGUE' | 'CUP';
  };
  referee?: {
    id: number;
    name: string;
  };
}

// Removed Finance — obsolete in current system

// Aliases
export type Player = SaveGamePlayer;
export type Coach = SaveGameCoach;
export type Division = SaveGameDivision;
export type Team = SaveGameTeam;
export type Match = SaveGameMatch;
