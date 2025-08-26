// frontend/src/services/matchService.ts

import api from "@/services/axios";

/** Optional helper if you expose this in your axios service */
async function fetchTeamMatchInfo(saveGameId: number, matchday: number, teamId: number) {
  const { data } = await api.get<{
    saveGameId: number;
    matchdayId: number;
    matchId: number;
    isHomeTeam: boolean;
    homeTeamId: number;
    awayTeamId: number;
    opponentTeamId: number;
  }>("/matchday/team-match-info", { params: { saveGameId, matchday, teamId } });
  return data;
}

/**
 * Persist the user's selection. Tries the new coach endpoint first, then falls back to the legacy per-match route.
 */
export async function saveCoachSelection(params: {
  saveGameId: number;
  matchday: number;
  coachTeamId: number;
  formation: string;
  lineupIds: number[];
  reserveIds: number[];
}) {
  const { saveGameId, matchday, coachTeamId, formation, lineupIds, reserveIds } = params;

  // 1) Preferred (new) route: save by saveGameId (no need for matchId/isHomeTeam)
  try {
    await api.post("/formation/coach", {
      saveGameId,
      formation,
      lineupIds,
      reserveIds,
    });
    return;
  } catch (e) {
    // fall back below
    console.warn("[FE-matchService] /formation/coach not available; falling back to per-match route", e);
  }

  // 2) Legacy route requires matchId + isHomeTeam
  const info = await fetchTeamMatchInfo(saveGameId, matchday, coachTeamId);
  await api.post(`/matches/${info.matchId}/formation`, {
    formation,
    isHomeTeam: info.isHomeTeam,
    lineupIds,
    reserveIds,
  });
}

/** Advance into MATCHDAY (engine will be started on backend) */
export async function advanceToMatchday(saveGameId: number) {
  await api.post("/matchday/advance", { saveGameId });
}
