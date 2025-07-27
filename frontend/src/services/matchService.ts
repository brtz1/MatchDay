// frontend/src/services/matchService.ts

import api from "@/services/axios";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export interface Match {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  matchdayNumber: number;
  matchdayType: "LEAGUE" | "CUP";
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
}

export interface MatchForm {
  homeTeamId: number;
  awayTeamId: number;
  refereeId: number;
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
  const response = await api.get<Match[]>("/match");
  return response.data;
}

export async function simulateMatch(form: MatchForm): Promise<Match> {
  const response = await api.post<Match>("/match/simulate", form);
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
