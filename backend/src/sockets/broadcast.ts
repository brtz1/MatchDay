// backend/src/sockets/broadcast.ts
import { getIO } from "./io";
import type { MatchEventType } from "@prisma/client";

/* ----------------------------------------------------------------------------
 * Payloads (align with FE)
 * ---------------------------------------------------------------------------- */
export type StageChangedPayload = {
  gameStage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";
};

export type MatchEventPayload = {
  matchId: number;
  minute: number;
  type: MatchEventType; // GOAL | RED | INJURY
  description: string;
  player: { id: number; name: string } | null;
};

export type MatchTickPayload = {
  id: number;      // legacy key some FE screens still use
  matchId: number; // canonical
  minute: number;
  homeGoals?: number;
  awayGoals?: number;
};

/** Reasons we pause the match and ask the coach to act */
export type PauseReason = "INJURY" | "GK_INJURY" | "GK_RED_NEEDS_GK";

/** Sent when the engine needs the UI to pause and open the coach popup */
export type PauseRequestPayload = {
  matchId: number;
  minute: number;
  isHomeTeam: boolean;
  reason: PauseReason;
  /** Player that triggered the pause, if known (e.g., injured GK) */
  player?: { id: number; name: string; position?: string | null } | null;
};

type Options = { alsoGlobal?: boolean };

/* ----------------------------------------------------------------------------
 * Core emitter (room-scoped with optional global fallback)
 * ---------------------------------------------------------------------------- */
function emit(event: string, payload: any, saveGameId?: number, opts?: Options) {
  const io = getIO();
  const alsoGlobal = !!opts?.alsoGlobal;

  if (typeof saveGameId === "number") {
    io.to(`save-${saveGameId}`).emit(event, payload);
    if (alsoGlobal) io.emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

/* ----------------------------------------------------------------------------
 * Public helpers
 * ---------------------------------------------------------------------------- */
export function broadcastStageChanged(
  payload: StageChangedPayload,
  saveGameId?: number,
  opts?: Options
) {
  emit("stage-changed", payload, saveGameId, opts);
}

/** Original helpers kept for backward-compat */
export function broadcastEventPayload(
  payload: MatchEventPayload,
  saveGameId?: number,
  opts?: Options
) {
  emit("match-event", payload, saveGameId, opts);
}

export function broadcastEvent(
  matchId: number,
  minute: number,
  type: MatchEventType,
  description: string,
  player: { id: number; name: string } | null = null,
  saveGameId?: number,
  opts?: Options
) {
  broadcastEventPayload({ matchId, minute, type, description, player }, saveGameId, opts);
}

/* ----------------------------------------------------------------------------
 * NEW: Unified helpers that match both old & new call sites
 *  - broadcastMatchEvent(saveGameId, { matchId, minute, type, description, player? })
 *  - broadcastMatchEvent(matchId, minute, type, description, player?, saveGameId?, opts?)
 *  - broadcastMatchTick(saveGameId, { matchId, minute, homeGoals?, awayGoals? })
 *  - broadcastMatchTick(matchId, minute, homeGoals?, awayGoals?, saveGameId?, opts?)
 * ---------------------------------------------------------------------------- */

/** Overloads for match-event */
export function broadcastMatchEvent(
  saveGameId: number,
  payload: MatchEventPayload,
  opts?: Options
): void;
export function broadcastMatchEvent(
  matchId: number,
  minute: number,
  type: MatchEventType,
  description: string,
  player?: { id: number; name: string } | null,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastMatchEvent(
  a: number,
  b: any,
  c?: any,
  d?: any,
  e?: any,
  f?: any,
  g?: any
) {
  // New style: (saveGameId, payload, opts?)
  if (typeof b === "object" && b !== null && "matchId" in b) {
    const saveGameId = a as number;
    const payload = b as MatchEventPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("match-event", payload, saveGameId, opts);
    return;
  }
  // Old style: (matchId, minute, type, description, player?, saveGameId?, opts?)
  const matchId = a as number;
  const minute = b as number;
  const type = c as MatchEventType;
  const description = d as string;
  const player = (e as { id: number; name: string } | null | undefined) ?? null;
  const saveGameId = (f as number | undefined) ?? undefined;
  const opts = (g as Options | undefined) ?? undefined;

  const payload: MatchEventPayload = { matchId, minute, type, description, player };
  emit("match-event", payload, saveGameId, opts);
}

/** Overloads for match-tick */
export function broadcastMatchTick(
  saveGameId: number,
  payload: MatchTickPayload,
  opts?: Options
): void;
export function broadcastMatchTick(
  matchId: number,
  minute: number,
  homeGoals?: number,
  awayGoals?: number,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastMatchTick(
  a: number,
  b: any,
  c?: any,
  d?: any,
  e?: any,
  f?: any
) {
  // New style: (saveGameId, payload, opts?)
  if (typeof b === "object" && b !== null && "matchId" in b) {
    const saveGameId = a as number;
    const payload = b as MatchTickPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("match-tick", payload, saveGameId, opts);
    return;
  }
  // Old style: (matchId, minute, homeGoals?, awayGoals?, saveGameId?, opts?)
  const matchId = a as number;
  const minute = b as number;
  const homeGoals = (c as number | undefined) ?? undefined;
  const awayGoals = (d as number | undefined) ?? undefined;
  const saveGameId = (e as number | undefined) ?? undefined;
  const opts = (f as Options | undefined) ?? undefined;

  const payload: MatchTickPayload = {
    id: matchId, // legacy key
    matchId,
    minute,
    ...(typeof homeGoals === "number" ? { homeGoals } : {}),
    ...(typeof awayGoals === "number" ? { awayGoals } : {}),
  };
  emit("match-tick", payload, saveGameId, opts);
}

/* ----------------------------------------------------------------------------
 * Pause request (engine → UI) for GK injury, GK red (with bench GK), etc.
 * ---------------------------------------------------------------------------- */
export function broadcastPauseRequest(
  payload: PauseRequestPayload,
  saveGameId?: number,
  opts?: Options
) {
  emit("pause-request", payload, saveGameId, opts);
}
