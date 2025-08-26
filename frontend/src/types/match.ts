// frontend/src/types/match.ts

/**
 * Shared match-related types for frontend.
 * Import this in services and components to avoid duplicate interfaces.
 */

export type MatchdayType = "LEAGUE" | "CUP";

/**
 * Minimal payload used to preview the next match on the Team Roster Game tab.
 * Note: `matchdayNumber` and `matchdayType` may be absent if the backend
 * returns null-ish values for edge cases; the UI can safely fallback.
 */
export interface MatchLite {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: string; // ISO string from backend
  refereeName?: string | null;
  matchdayNumber?: number;
  matchdayType?: MatchdayType;
}

/** Common service return for "next match" endpoints */
export type NextMatchResponse = MatchLite | null;
