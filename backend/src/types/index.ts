// backend/src/types/index.ts

export type GameStage = 'ACTION' | 'MATCHDAY' | 'HALFTIME' | 'RESULTS' | 'STANDINGS';
export type MatchdayType = 'LEAGUE' | 'CUP';

export interface SaveGamePlayer {
  id: number;
  name: string;
  position: 'GK' | 'DF' | 'MF' | 'AT';
  rating: number;
  salary: number;
  nationality: string;
  underContract: boolean;
  saveGameTeamId: number;
}

export interface SaveGameCoach {
  id: number;
  name: string;
  level: number;
  morale: number;
}

export interface SaveGameDivision {
  id: number;
  name: string;
  level: number;
}

export interface SaveGameTeam {
  id: number;
  name: string;
  country: string;
  division: SaveGameDivision;
  coach: SaveGameCoach;
  primaryColor?: string;
  secondaryColor?: string;
  stadiumSize: number;
  ticketPrice: number;
  rating: number;
  budget: number;
  saveGameId: number;
}

export interface Finance {
  salaryTotal: number;
  salaryByPlayer: {
    id: number;
    name: string;
    salary: number;
  }[];
}

export interface SaveGameMatch {
  id: number;
  matchDate: string;
  played: boolean;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam?: SaveGameTeam;
  awayTeam?: SaveGameTeam;
  matchday?: {
    id: number;
    name: string;
    type: MatchdayType;
  };
  referee?: {
    id: number;
    name: string;
  };
}

export interface GameState {
  currentSaveGameId: number;
  currentTeamId: number;
  gameStage: GameStage;
  currentMatchday: number;
  matchdayType: MatchdayType;
}
