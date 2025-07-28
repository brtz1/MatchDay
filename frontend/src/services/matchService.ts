import api from "@/services/axios";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export interface Match {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  matchdayId?: number;
  matchdayType: "LEAGUE" | "CUP";
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
  matchDate?: string;

  // Enriched data from backend
  homeTeam?: { id: number; name: string };
  awayTeam?: { id: number; name: string };
  matchday?: { number: number; type: string };
}

export interface MatchForm {
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  matchdayType?: "LEAGUE" | "CUP";
}

/* ------------------------------------------------------------------------- */
/* API Calls                                                                 */
/* ------------------------------------------------------------------------- */

export async function setFormation(
  matchId: number,
  teamId: number,
  formation: string,
  isHomeTeam: boolean
): Promise<{ lineup: number[]; bench: number[] }> {
  const response = await api.post(`/matches/${matchId}/formation`, {
    teamId,
    formation,
    isHomeTeam,
  });
  return response.data;
}

export async function getMatches(): Promise<Match[]> {
  const response = await api.get<Match[]>("/matches");
  return response.data;
}

export async function simulateMatch(matchId: number): Promise<Match> {
  const response = await api.post<Match>(`/matches/${matchId}/simulate`);
  return response.data;
}

/* ------------------------------------------------------------------------- */
/* Export                                                                    */
/* ------------------------------------------------------------------------- */

export default {
  setFormation,
  getMatches,
  simulateMatch,
};
