// frontend/src/services/pkService.ts
//
// Thin axios wrapper for Penalty Kicks (PK).
// Endpoints expected (align with your backend):
// - POST /pk/take                -> resolve a single in-match penalty for coached team
// - POST /pk/ack                 -> acknowledge shootout page; backend advances stage/flow
// - GET  /pk/state               -> (optional) fetch current shootout state (for page reloads)
// - POST /pk/shootout/start      -> (optional) manually trigger a shootout (useful for tests)
//
// Also exposes a tiny local preference for skipping PK animations.

import api from "@/services/axios";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type PkOutcome = "GOAL" | "MISS" | "SAVE";

export interface Score {
  home: number;
  away: number;
}

/** One interleaved shootout attempt (as broadcast by socket or fetched from state) */
export interface PkAttempt {
  matchId: number;
  isHome: boolean;
  shooterId: number;
  shooterName?: string;
  /** 0-based within that team's order */
  shotIndex: number;
  outcome: PkOutcome;
  /** live tally right after this attempt */
  tally: Score;
  /** when present/true marks the attempt that decided the shootout */
  decided?: boolean;
  /** optional duplicate marker some engines send */
  decisive?: boolean;
}

export interface ShooterBrief {
  id: number;
  name?: string;
}

export interface TeamOrder {
  id: number;
  name: string;
  shooters: ShooterBrief[]; // pre-ordered by AT→MF→DF, rating desc (backend side)
}

export interface PkStartPayload {
  matchId: number;
  home: TeamOrder;
  away: TeamOrder;
}

export interface PkEndPayload {
  matchId: number;
  winnerTeamId: number;
  tally: Score;
}

export interface PkShootoutState {
  matchId: number;
  home: TeamOrder;
  away: TeamOrder;
  attempts: PkAttempt[];
  end?: PkEndPayload | null;
}

export interface TakePenaltyRequest {
  saveGameId: number;
  matchId: number;
  shooterId: number;
  /** Optional explicit minute for attribution */
  minute?: number;
}

export interface TakePenaltyResponse {
  outcome: PkOutcome;
  /** New match score after applying the penalty, if goal */
  newScore?: Score;
}

export interface AckShootoutRequest {
  saveGameId: number | null;
  matchId: number | null;
}

/* ------------------------------------------------------------------------- */
/* Core calls                                                                */
/* ------------------------------------------------------------------------- */

/**
 * Resolve a single in-match penalty for the coached team.
 * Backend applies outcome, writes events, updates score if GOAL,
 * emits `penalty-result`.
 */
export async function takePenalty(
  params: TakePenaltyRequest,
  signal?: AbortSignal,
): Promise<TakePenaltyResponse> {
  const { data } = await api.post<TakePenaltyResponse>("/pk/take", params, { signal });
  // Be defensive about payload shape:
  const oc = (data?.outcome ?? "MISS") as PkOutcome;
  const ns =
    data?.newScore && typeof data.newScore.home === "number"
      ? data.newScore
      : undefined;
  return { outcome: oc, newScore: ns };
}

/**
 * Acknowledge the end of a shootout visualisation so the backend
 * can progress the standard flow (RESULTS → STANDINGS → back to Team).
 */
export async function ackShootoutReady(
  params: AckShootoutRequest,
  signal?: AbortSignal,
): Promise<void> {
  await api.post("/pk/ack", params, { signal });
}

/**
 * Fetch the current shootout state (useful on page reloads).
 * If backend route is not implemented, returns null.
 */
export async function getShootoutState(
  opts?: { saveGameId?: number | null; matchId?: number | null },
  signal?: AbortSignal,
): Promise<PkShootoutState | null> {
  try {
    const { data } = await api.get<PkShootoutState | null>("/pk/state", {
      params: { saveGameId: opts?.saveGameId ?? undefined, matchId: opts?.matchId ?? undefined },
      signal,
    });
    // Null means "no active shootout"
    if (!data) return null;
    return data;
  } catch {
    // Graceful no-op if the endpoint doesn't exist yet
    return null;
  }
}

/**
 * (Optional) Manually start a shootout. Handy for tests/dev tools.
 * Backend should return the initial state (or immediately broadcast pk-start).
 */
export async function startShootout(
  params: { saveGameId: number; matchId: number },
  signal?: AbortSignal,
): Promise<PkShootoutState> {
  const { data } = await api.post<PkShootoutState>("/pk/shootout/start", params, { signal });
  return data;
}

/* ------------------------------------------------------------------------- */
/* Local preference: skip animations                                         */
/* ------------------------------------------------------------------------- */

const LS_KEY_SKIP = "pk.skipAnimations";

/** Persist a local-only preference to skip PK animations/transitions */
export function setSkipAnimations(skip: boolean) {
  try {
    localStorage.setItem(LS_KEY_SKIP, skip ? "1" : "0");
  } catch {
    /* ignore storage errors */
  }
}

/** Read the local preference to skip PK animations/transitions */
export function getSkipAnimations(): boolean {
  try {
    return localStorage.getItem(LS_KEY_SKIP) === "1";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------- */
/* Default export (service-style)                                            */
/* ------------------------------------------------------------------------- */

const pkService = {
  takePenalty,
  ackShootoutReady,
  getShootoutState,
  startShootout,
  setSkipAnimations,
  getSkipAnimations,
};

export default pkService;
