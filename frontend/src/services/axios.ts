import axios, { AxiosError, isAxiosError, type InternalAxiosRequestConfig } from "axios";

/* ----------------------------------------------------------------------------
   Base URL
   - Uses VITE_API_URL (e.g. https://prod.api.matchday.app) then appends `/api`
   - Fallback: http://localhost:4000/api
   - Callers should use paths like `/matches`, NOT `/api/matches`
---------------------------------------------------------------------------- */

// Augment Window to avoid `(window as any)` casts.
declare global {
  interface Window {
    __API_URL__?: string;
  }
}

// Narrow typing for import.meta.env access without using `any`
type ImportMetaEnvLike = {
  env?: Record<string, string | undefined>;
};

const META = (import.meta as unknown as ImportMeta & ImportMetaEnvLike);
const RAW_BASE =
  META.env?.VITE_API_URL ||
  (typeof window !== "undefined" ? window.__API_URL__ : undefined) ||
  "http://localhost:4000";

const BASE_URL = `${String(RAW_BASE).replace(/\/+$/, "")}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

/* ----------------------------------------------------------------------------
   Request Interceptor
   - Inject Bearer token
   - Normalize URLs so accidental `/api/...` in calls won’t double prefix
---------------------------------------------------------------------------- */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof config.url === "string") {
      let url = config.url;

      // Ensure leading slash
      if (!url.startsWith("/")) url = `/${url}`;

      // Strip accidental `/api/` prefix
      if (url.startsWith("/api/")) url = url.replace(/^\/api/, "");

      config.url = url;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ----------------------------------------------------------------------------
   Response Interceptor (dev logging)
---------------------------------------------------------------------------- */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const silent = (err.config as any)?.headers?.['X-Silent'];
    if (import.meta.env.DEV && !silent) {
      console.error('[axios]', err.response ?? err.message);
    }
    return Promise.reject(err);
  }
);
/* ============================================================================
   Shared Types — keep in sync with backend
============================================================================ */
export type MatchdayType = "LEAGUE" | "CUP";
export type GameStage = "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";

export interface TeamSlimDTO { id: number; name: string; }

export interface MatchDTO {
  id: number;
  homeTeam: TeamSlimDTO;
  awayTeam: TeamSlimDTO;
  homeGoals: number;
  awayGoals: number;
  minute?: number;    // server sends via socket; may be absent in REST
  division: string;
}

export interface MatchEventDTO {
  id?: number;               // present when from REST
  matchId: number;
  minute: number;
  type: string;              // sockets may use enum; keep as string for FE display
  description: string;
  player?: { id: number; name: string } | null;
}

export interface PlayerDTO {
  id: number;
  name: string;
  position: string;
  rating: number;
  isInjured: boolean;
}

export interface MatchStateDTO {
  lineup: PlayerDTO[];
  bench: PlayerDTO[];
  subsRemaining: number;
}

export interface GameStateDTO {
  id: number;
  season?: number;
  currentSaveGameId: number | null;
  currentMatchday: number;
  matchdayType: MatchdayType;
  gameStage: GameStage;
  coachTeamId?: number | null;
}

export interface TeamMatchInfoDTO {
  matchId: number;
  isHomeTeam: boolean;
}

/* --- Standings (grouped by division; matches backend /standings route) ---- */
/** NEW canonical standings row (matches backend): */
export interface StandingsRowDTO {
  teamId: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  position: number;
}
export interface DivisionStandingsDTO {
  division: string;
  rows: StandingsRowDTO[];
}

/* ============================================================================
   Centralized API Wrappers
   (Grouped roughly by feature area)
============================================================================ */

/* -- Game State ------------------------------------------------------------ */
export async function getGameState(): Promise<GameStateDTO> {
  const { data } = await api.get<GameStateDTO>("/gamestate");
  return data;
}

export async function setStage(payload: {
  saveGameId: number;
  stage: GameStage;
}): Promise<{ gameStage: GameStage }> {
  const res = await api.post<{ gameStage: GameStage }>("/matchday/set-stage", payload);
  if (!res.data?.gameStage) throw new Error("set-stage returned no gameStage");
  return res.data;
}

/* -- Formation / Coach XI -------------------------------------------------- */
/** POST /formation/coach — persist confirmed XI exactly as chosen on FE. */
export async function postCoachFormation(payload: {
  saveGameId: number;
  teamId: number;
  lineupIds: number[];   // 11 ids (1 GK + 10 outfielders enforced on FE)
  reserveIds: number[];  // 0..6 ids
  formation: string;     // derived "DF-MF-AT" string from FE lineup
}): Promise<{ ok: true }> {
  const { data } = await api.post<{ ok: true }>("/formation/coach", payload);
  return data ?? { ok: true };
}

/* -- Matchday Flow --------------------------------------------------------- */
export async function advanceMatchday(payload: {
  saveGameId: number;
}): Promise<{ saveGameId: number; matchdayId: number; message: string }> {
  const { data } = await api.post<{ saveGameId: number; matchdayId: number; message: string }>(
    "/matchday/advance",
    payload
  );
  return data;
}

/**
 * RESULTS -> STANDINGS (used after matches end).
 * Backend: POST /matchday/advance-after-results { saveGameId }
 */
export async function advanceAfterResults(saveGameId: number): Promise<{ ok: true; coachTeamId: number | null }> {
  const { data } = await api.post<{ ok: true; coachTeamId: number | null }>(
    "/matchday/advance-after-results",
    { saveGameId }
  );
  return data;
}

/* -- Team’s fixture info for a given matchday ------------------------------ */
/**
 * Overloaded helper to match both legacy (object) and new (positional) call sites.
 * Backend: GET /matchday/team-match-info?saveGameId&matchday&teamId
 */
export function getTeamMatchInfo(saveGameId: number, matchday: number, teamId: number): Promise<TeamMatchInfoDTO>;
export function getTeamMatchInfo(params: { saveGameId: number; matchday: number; teamId: number }): Promise<TeamMatchInfoDTO>;
export async function getTeamMatchInfo(
  arg1: number | { saveGameId: number; matchday: number; teamId: number },
  arg2?: number,
  arg3?: number
): Promise<TeamMatchInfoDTO> {
  const params =
    typeof arg1 === "number"
      ? { saveGameId: arg1, matchday: arg2 as number, teamId: arg3 as number }
      : arg1;
  const { data } = await api.get<TeamMatchInfoDTO>("/matchday/team-match-info", { params });
  return data;
}

/* -- Live Matches + Events ------------------------------------------------- */
export async function getMatchesByMatchday(matchday: number): Promise<MatchDTO[]> {
  const { data } = await api.get<MatchDTO[]>("/matches", { params: { matchday } });
  return data ?? [];
}

/** GET /match-events/by-matchday/:number → { [matchId]: MatchEventDTO[] } */
export async function getMatchEventsByMatchday(
  matchdayNumber: number
): Promise<Record<number, MatchEventDTO[]>> {
  const { data } = await api.get<Record<number, MatchEventDTO[]>>(
    `/match-events/by-matchday/${matchdayNumber}`
  );
  return data ?? {};
}

/** GET /matchstate/:matchId?side=home|away */
export async function getMatchState(matchId: number, side: "home" | "away"): Promise<MatchStateDTO> {
  const { data } = await api.get<MatchStateDTO>(`/matchstate/${matchId}`, { params: { side } });
  return data;
}

/** POST /matchstate/:matchId/substitute  (aligned with backend route) */
export async function postSubstitution(
  matchId: number,
  payload: { outId: number; inId: number; isHomeTeam: boolean } | { out: number; in: number; isHomeTeam: boolean }
): Promise<MatchStateDTO> {
  const { data } = await api.post<MatchStateDTO>(`/matchstate/${matchId}/substitute`, payload as any);
  return data;
}

/* -- Teams (SaveGame Teams) ------------------------------------------------ */
/**
 * Safe default getter for a team with players.
 * Adjust path to your mounted route (saveGameTeamRoute):
 *   GET /save-game-teams/:id
 */
export interface SaveGameTeamDTO {
  id: number;
  name: string;
  division?: number;
  morale?: number;
  coachName?: string | null;
  colors?: { primary: string; secondary: string } | null;
  stadiumCapacity?: number | null;
  players: PlayerDTO[];
}
export async function getSaveGameTeamById(teamId: number): Promise<SaveGameTeamDTO> {
  const { data } = await api.get<SaveGameTeamDTO>(`/save-game-teams/${teamId}`);
  return data;
}

/* -- Standings / Results / Cup -------------------------------------------- */
/**
 * Grouped standings that match backend `/standings` & `/standings/current`
 *     -> returns array of divisions with their ordered rows
 */
export async function getCurrentStandings(saveGameId?: number): Promise<DivisionStandingsDTO[]> {
  const params = saveGameId ? { saveGameId } : undefined;
  const { data } = await api.get<DivisionStandingsDTO[]>("/standings/current", { params });
  return data ?? [];
}

/** Finalize standings after grace: increments day (or rolls season) and sets ACTION */
export interface FinalizeStandingsResponse {
  ok: true;
  saveGameId: number;
  coachTeamId: number | null;
  season: number;
  currentMatchday: number;
  matchdayType: MatchdayType;
  gameStage: GameStage;
}
export async function finalizeStandings(saveGameId?: number): Promise<FinalizeStandingsResponse> {
  const payload = saveGameId ? { saveGameId } : {};
  const { data } = await api.post<FinalizeStandingsResponse>("/standings/finalize", payload);
  return data;
}

/** If Results page needs a summary by matchday */
export interface ResultsSummaryDTO {
  matchday: number;
  matches: MatchDTO[];
}
export async function getResultsByMatchday(matchday: number): Promise<ResultsSummaryDTO> {
  const { data } = await api.get<ResultsSummaryDTO>("/matches/results", { params: { matchday } });
  return data;
}

/** Cup log/bracket — leave response shape generic for now */
export async function getCupLog<T = unknown>(): Promise<T> {
  const { data } = await api.get<T>("/cup/log");
  return data;
}

/* -- Save Games (if/when used by Load/Save screens) ----------------------- */
export interface SaveGameListItemDTO {
  id: number;
  name?: string;
  coachName?: string;
  createdAt: string;
}
export async function listSaveGames(): Promise<SaveGameListItemDTO[]> {
  const { data } = await api.get<SaveGameListItemDTO[]>("/save-game");
  return data ?? [];
}

// Leave details generic to avoid `any` and let the caller specify the shape if needed.
export async function getSaveGame<T = unknown>(id: number): Promise<T> {
  const { data } = await api.get<T>(`/save-game/${id}`);
  return data;
}

export async function createSaveGame<TPayload extends Record<string, unknown>, TResp = unknown>(
  payload: TPayload
): Promise<TResp> {
  const { data } = await api.post<TResp>("/save-game", payload);
  return data;
}

/* ============================================================================
   Utilities
============================================================================ */
export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function getApiBaseUrl() {
  return BASE_URL;
}

export { isAxiosError };
export default api;




