import axios from '@/services/axios';

export interface CupMatch {
  homeTeam: {
    name: string;
    goals: number | null;
  };
  awayTeam: {
    name: string;
    goals: number | null;
  };
  played: boolean;
}

export interface CupRound {
  matchdayNumber: number;
  roundLabel: string;
  matches: CupMatch[];
}

/**
 * GET `/api/cup/log`
 * Fetches all cup rounds with matches
 */
export async function getCupLog(): Promise<CupRound[]> {
  const { data } = await axios.get<CupRound[]>('/cup/log');
  return data;
}
