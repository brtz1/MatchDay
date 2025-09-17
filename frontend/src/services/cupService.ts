import axios from '@/services/axios';

/** Raw match from GET /api/cup/log */
export interface ApiCupMatch {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: { name: string; goals: number | null };
  awayTeam: { name: string; goals: number | null };
  played: boolean;
}

/** Raw round from GET /api/cup/log */
export interface ApiCupRound {
  matchdayNumber: number;
  roundLabel: string;
  matches: ApiCupMatch[];
}

/**
 * GET `/api/cup/log`
 * Fetches all cup rounds with matches.
 *
 * Note: if your axios baseURL already includes `/api`,
 * keep the path as `/cup/log`. Otherwise, change to `/api/cup/log`.
 */
export async function getCupLog(): Promise<ApiCupRound[]> {
  const { data } = await axios.get<ApiCupRound[]>('/cup/log');
  return data;
}
