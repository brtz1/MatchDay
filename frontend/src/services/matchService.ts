// frontend/src/services/matchService.ts
import api from "@/services/axios";
import type { MatchEventDTO } from "@/types";

/** Shape returned by GET /api/match-events/by-matchday/:number */
export type GroupedEventsByMatch = Record<number, MatchEventDTO[]>;

/** Backend payload shape for /matchday/advance (we forward selection so engine uses final picks) */
export type AdvancePayload = {
  saveGameId: number;
  formation?: string;
  lineupIds?: number[];
  reserveIds?: number[];
};

/** Optional helper if you expose this in your axios service */
async function fetchTeamMatchInfo(saveGameId: number, matchday: number, teamId: number) {
  // BE route returns only { matchId, isHomeTeam }
  const { data } = await api.get<{
    matchId: number;
    isHomeTeam: boolean;
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
    // eslint-disable-next-line no-console
    console.warn(
      "[FE-matchService] /formation/coach not available; falling back to per-match route",
      e
    );
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

/**
 * Advance into MATCHDAY (engine will be started on backend).
 * Backward-compatible:
 *   - advanceToMatchday(42)
 *   - advanceToMatchday({ saveGameId: 42, formation, lineupIds, reserveIds })
 */
export async function advanceToMatchday(
  arg: number | AdvancePayload
): Promise<{ saveGameId: number; matchdayNumber: number; advanced?: boolean }> {
  const payload: AdvancePayload =
    typeof arg === "number"
      ? { saveGameId: arg }
      : {
          saveGameId: arg.saveGameId,
          formation: arg.formation,
          lineupIds: arg.lineupIds,
          reserveIds: arg.reserveIds,
        };

  const { data } = await api.post<{ saveGameId: number; matchdayNumber: number; advanced?: boolean }>(
    "/matchday/advance",
    payload
  );

  return data;
}

/** Get all events for a given matchday, grouped by matchId. */
export async function getMatchEventsByMatchday(
  matchdayNumber: number
): Promise<GroupedEventsByMatch> {
  const { data } = await api.get<GroupedEventsByMatch>(
    `/match-events/by-matchday/${matchdayNumber}`
  );
  return data ?? {};
}

/** Get events for a single match (SaveGameMatch.id). */
export async function getMatchEventsByMatchId(matchId: number): Promise<MatchEventDTO[]> {
  const { data } = await api.get<MatchEventDTO[]>(`/match-events/${matchId}`);
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* NEW: Head-to-head helper used by GameTab’s dynamic import          */
/* ------------------------------------------------------------------ */

export type HeadToHeadAPI =
  | { text: string }                         // simplest form
  | { summary: string }                      // alternate field
  | { result: string }                       // alternate field
  | {
      // richer payload (we’ll synthesize a string if needed)
      homeTeamId: number;
      awayTeamId: number;
      homeTeamName?: string | null;
      awayTeamName?: string | null;
      homeGoals?: number | null;
      awayGoals?: number | null;
      matchdayNumber?: number | null;
      timestamp?: string | null;
    };

/**
 * Return last H2H as an object that includes at least one of:
 *  - { text } or { summary } or { result }
 * If BE returns a richer object, we'll keep it and the caller can stringify it.
 */
export async function getLastHeadToHead(
  homeId: number,
  awayId: number,
  opts?: { saveGameId?: number }
): Promise<HeadToHeadAPI> {
  // Prefer axios base URL (/api) via our api instance.
  const { data } = await api.get<HeadToHeadAPI>("/matches/last-head-to-head", {
    params: {
      homeId,
      awayId,
      ...(opts?.saveGameId ? { saveGameId: opts.saveGameId } : {}),
    },
  });

  // If BE didn't provide text/summary/result, synthesize a short line.
  if (data && typeof data === "object" && !("text" in data) && !("summary" in data) && !("result" in data)) {
    const d = data as any;
    const hn = d.homeTeamName ?? `Team ${d.homeTeamId ?? "?"}`;
    const an = d.awayTeamName ?? `Team ${d.awayTeamId ?? "?"}`;
    const hg = typeof d.homeGoals === "number" ? d.homeGoals : null;
    const ag = typeof d.awayGoals === "number" ? d.awayGoals : null;
    const md = typeof d.matchdayNumber === "number" ? d.matchdayNumber : null;

    if (hg !== null && ag !== null) {
      const line = `${hn} ${hg}-${ag} ${an}${md ? ` (Matchday ${md})` : ""}`;
      return { text: line };
    }
  }

  return data;
}
