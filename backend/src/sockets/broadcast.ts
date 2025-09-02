// backend/src/sockets/broadcast.ts
import { getIO, roomForSave } from "./io";
import type { MatchEventType } from "@prisma/client";

/* ----------------------------------------------------------------------------
 * Payloads (align with FE)
 * ---------------------------------------------------------------------------- */
export type StageChangedPayload = {
  gameStage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";
  matchdayNumber?: number; // optional, useful for clients to sync UI
};

export type MatchEventPayload = {
  matchId: number;
  minute: number;
  type: MatchEventType; // e.g., GOAL | RED | INJURY
  description: string;
  /** If available, the player involved (resolved server-side) */
  player?: { id: number; name: string } | null;
  /** NEW: tells FE which side scored / got card / got injured */
  isHomeTeam?: boolean;
};

export type MatchTickPayload = {
  // FE canonical keys:
  matchId: number;
  minute: number;
  homeGoals?: number;
  awayGoals?: number;

  // Legacy key kept to avoid breaking older views (safe to remove later)
  id?: number;
};

/** Reasons we pause the match and ask the coach to act */
export type PauseReason =
  | "INJURY"
  | "GK_INJURY"
  | "GK_RED_NEEDS_GK";

export type PauseRequestPayload = {
  matchId: number;
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
    io.to(roomForSave(saveGameId)).emit(event, payload);
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
  playerOrSaveGamePlayerId?: { id: number; name: string } | number | null,
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

  // Old style:
  // (matchId, minute, type, description, playerOrSaveGamePlayerId?, saveGameId?, opts?)
  const matchId = a as number;
  const minute = b as number;
  const type = c as MatchEventType;
  const description = d as string;

  let player: { id: number; name: string } | null = null;
  let saveGamePlayerId: number | undefined;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof e === "number") {
    // e is saveGamePlayerId
    saveGamePlayerId = e;
    saveGameId = (f as number | undefined) ?? undefined;
    opts = (g as Options | undefined) ?? undefined;
  } else {
    // e is player object (or null/undefined)
    player = (e as { id: number; name: string } | null | undefined) ?? null;
    saveGameId = (f as number | undefined) ?? undefined;
    opts = (g as Options | undefined) ?? undefined;
  }

  const payload: MatchEventPayload = {
    matchId,
    minute,
    type,
    description,
    ...(typeof saveGamePlayerId === "number" ? { /* unresolved id for consumers that want it */ } : {}),
    ...(player ? { player } : {}),
  };
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
    matchId,
    minute,
    ...(typeof homeGoals === "number" ? { homeGoals } : {}),
    ...(typeof awayGoals === "number" ? { awayGoals } : {}),
    id: matchId, // legacy key
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
