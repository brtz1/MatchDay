// backend/src/sockets/broadcast.ts
import { getIO, roomForSave } from "./io";
import type { MatchEventType } from "@prisma/client";

export function broadcastStandingsUpdated(
  saveGameId: number,
  payload: { saveGameId?: number },
  opts?: Options
): void;
export function broadcastStandingsUpdated(
  payload: { saveGameId?: number },
  saveGameId?: number,
  opts?: Options
): void;

// Implementation
export function broadcastStandingsUpdated(
  a: number | { saveGameId?: number },
  b?: { saveGameId?: number } | number,
  c?: Options
) {
  // Form A: (saveGameId, payload?, opts?)
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = (b as { saveGameId?: number } | undefined) ?? {};
    const opts = (c as Options | undefined) ?? undefined;

    const full = { ...payload, saveGameId };
    emit("standings-updated", full, saveGameId, opts);
    return;
  }

  // Form B: (payload, saveGameId?, opts?)
  const payload = (a as { saveGameId?: number } | undefined) ?? {};
  const saveGameId =
    typeof b === "number" ? (b as number) : (payload.saveGameId as number | undefined);
  const opts = (typeof b === "number" ? c : (b as Options | undefined)) ?? undefined;

  const full =
    typeof saveGameId === "number" ? { ...payload, saveGameId } : payload;

  emit("standings-updated", full, saveGameId, opts);
}

/* ----------------------------------------------------------------------------
 * Payloads (align with FE)
 * ---------------------------------------------------------------------------- */
export type StageChangedPayload = {
  gameStage:
    | "ACTION"
    | "MATCHDAY"
    | "HALFTIME"
    | "RESULTS"
    | "STANDINGS"
    | "PENALTIES";
  matchdayNumber?: number; // optional, useful for clients to sync UI
  /**
   * Optional: included in the emitted payload whenever known, lets FE filter
   * out cross-save noise if a global emit ever occurs.
   */
  saveGameId?: number;
};

export type MatchEventPayload = {
  matchId: number;
  minute: number;
  type: MatchEventType; // e.g., GOAL | RED | INJURY
  description: string;
  /** If available, the player involved (resolved server-side) */
  player?: { id: number; name: string } | null;
  /** Tells FE which side scored / was affected */
  isHomeTeam?: boolean;
};

export type MatchTickPayload = {
  // FE canonical keys:
  matchId: number;
  minute: number;
  homeGoals?: number;
  awayGoals?: number;

  /** Phase of play to help FE filter views (e.g., show only ET games) */
  phase?: "NORMAL" | "ET" | "PENS";

  // Legacy key kept to avoid breaking older views (safe to remove later)
  id?: number;
};

/** Legacy shape that some old call sites may still send. */
type MatchTickPayloadLegacy = {
  matchId: number;
  minute: number;
  homeScore?: number;
  awayScore?: number;
  id?: number;
};

export type PauseReason =
  | "INJURY"
  | "GK_INJURY"
  | "GK_RED_NEEDS_GK"
  | "ET_HALF";

export type PauseRequestPayload = {
  matchId: number;
  isHomeTeam: boolean;
  reason: PauseReason;
  /** Player that triggered the pause, if known (e.g., injured GK) */
  player?: { id: number; name: string; position?: string | null; rating?: number } | null;
};

/** ✅ New: payload for notifying FE that a new Cup round has been created */
export type CupRoundCreatedPayload = {
  /** e.g., "Round of 64", "Quarterfinal" */
  roundLabel: string;
  /** Global calendar number for that round (e.g., 6, 8, 11, ...) */
  matchdayNumber: number;
  /** Optional: DB id for the created matchday row */
  matchdayId?: number;
  /** Optional: how many matches were generated for this round */
  matches?: number;
};

/* ----------------------------------------------------------------------------
 * ✅ NEW — Penalties (Shootout + single in-match penalty)
 * ---------------------------------------------------------------------------- */

/** Players included in PK-related payloads */
export type PKPlayer = {
  id: number;
  name: string;
  position?: string | null;
  rating?: number;
};

/** Shootout start payload */
export type PKStartPayload = {
  matchId: number;
  /** Who shoots first this round */
  firstShooter: "HOME" | "AWAY";
  /** Usually 5 */
  bestOf?: number;
  /** Primary ordered 5 takers for each side */
  homeOrder: PKPlayer[];
  awayOrder: PKPlayer[];
  /** Optional sudden-death queues (beyond first 5) */
  homeQueue?: PKPlayer[];
  awayQueue?: PKPlayer[];
};

/** Individual attempt outcome in a shootout */
export type PKAttemptOutcome = "SCORED" | "MISSED" | "SAVED";

/** Shootout attempt payload (emitted per attempt) */
export type PKAttemptPayload = {
  matchId: number;
  isHomeTeam: boolean;
  shooter: PKPlayer;
  /** Overall attempt index starting at 1 (1..N across both teams) */
  attemptNumber: number;
  /** Round index within the best-of (1..bestOf), 6+ means sudden death */
  roundNumber: number;
  /** Optional: include outcome when emitting post-resolution */
  outcome?: PKAttemptOutcome;
  /** Optional: running tallies after this attempt */
  homeScore?: number;
  awayScore?: number;
  /** Optional: true if the shootout is decided at this attempt */
  decided?: boolean;
};

/** Shootout end payload */
export type PKEndPayload = {
  matchId: number;
  winner: "HOME" | "AWAY";
  homeScore: number;
  awayScore: number;
  /** Number of total attempts taken across both teams */
  rounds: number;
  suddenDeath: boolean;
};

/** When a normal-time/ET penalty is awarded (not a shootout) */
export type PenaltyAwardedPayload = {
  matchId: number;
  minute: number;
  isHomeTeam: boolean;
  /** Optional: server-provided candidates for UI selection when coached team */
  candidates?: PKPlayer[];
  /** Optional: server suggestion for default shooter */
  defaultShooterId?: number;
};

/** Result of a normal-time/ET penalty */
export type PenaltyResultOutcome = "GOAL" | "MISS" | "SAVE";

export type PenaltyResultPayload = {
  matchId: number;
  minute: number;
  isHomeTeam: boolean;
  shooter: PKPlayer;
  outcome: PenaltyResultOutcome;
  description?: string;
  /** New scoreboard after resolution (if GOAL) */
  homeGoals?: number;
  awayGoals?: number;
};

type Options = { alsoGlobal?: boolean };

/* ----------------------------------------------------------------------------
 * Core emitter (room-scoped with optional global fallback)
 * ---------------------------------------------------------------------------- */
function emit(event: string, payload: any, saveGameId?: number, opts?: Options) {
  const io = getIO();
  const alsoGlobal = !!opts?.alsoGlobal;

  if (typeof saveGameId === "number") {
    // Primary: emit only to the save-specific room
    io.to(roomForSave(saveGameId)).emit(event, payload);
    // Optional/global echo (discouraged for live events)
    if (alsoGlobal) io.emit(event, payload);
  } else {
    // Fallback global emit if no save id was provided
    io.emit(event, payload);
  }
}

/* ----------------------------------------------------------------------------
 * Public helpers
 * ---------------------------------------------------------------------------- */

/** Overloads for stage-changed (supports both call orders) */
export function broadcastStageChanged(
  saveGameId: number,
  payload: StageChangedPayload,
  opts?: Options
): void;
export function broadcastStageChanged(
  payload: StageChangedPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastStageChanged(
  a: number | StageChangedPayload,
  b?: StageChangedPayload | number,
  c?: Options
) {
  // In-memory dedupe: avoid spamming identical stage for the same save.
  // Keeps UX clean when both engine and HTTP endpoints flip the same stage.
  type LastKey = { stage: string; matchday?: number; at: number };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const globalAny = global as unknown as { __lastStage?: Map<number, LastKey> };
  if (!globalAny.__lastStage) globalAny.__lastStage = new Map<number, LastKey>();

  const shouldSkip = (saveId: number | undefined, payload: StageChangedPayload) => {
    if (typeof saveId !== "number") return false;
    const last = globalAny.__lastStage!.get(saveId);
    const now: LastKey = { stage: String(payload.gameStage), matchday: payload.matchdayNumber, at: Date.now() };
    if (last && last.stage === now.stage && last.matchday === now.matchday && now.at - last.at < 1000) {
      return true;
    }
    globalAny.__lastStage!.set(saveId, now);
    return false;
  };

  // Form A: (saveGameId, payload, opts?)
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as StageChangedPayload;
    const opts = (c as Options | undefined) ?? undefined;

    // Always include saveGameId in the payload when we know it
    const full: StageChangedPayload = { ...payload, saveGameId };
    if (shouldSkip(saveGameId, full)) return;
    emit("stage-changed", full, saveGameId, opts);
    return;
  }

  // Form B: (payload, saveGameId?, opts?)
  const payload = a as StageChangedPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  const full: StageChangedPayload =
    typeof saveGameId === "number" ? { ...payload, saveGameId } : payload;
  if (shouldSkip(saveGameId, full)) return;
  emit("stage-changed", full, saveGameId, opts);
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
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof e === "number") {
    // e was a saveGamePlayerId in very old code paths — FE doesn't need it, ignore.
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
    ...(player ? { player } : {}),
  };

  emit("match-event", payload, saveGameId, opts);
}

/** Overloads for match-tick */
export function broadcastMatchTick(
  saveGameId: number,
  payload: MatchTickPayload | (MatchTickPayload & MatchTickPayloadLegacy),
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
    const raw = b as MatchTickPayload & Partial<MatchTickPayloadLegacy>;
    const opts = (c as Options | undefined) ?? undefined;

    // Normalize to canonical keys homeGoals/awayGoals (accept legacy homeScore/awayScore)
    const payload: MatchTickPayload = {
      matchId: raw.matchId,
      minute: raw.minute,
      ...(typeof raw.homeGoals === "number"
        ? { homeGoals: raw.homeGoals }
        : typeof raw.homeScore === "number"
        ? { homeGoals: raw.homeScore }
        : {}),
      ...(typeof raw.awayGoals === "number"
        ? { awayGoals: raw.awayGoals }
        : typeof raw.awayScore === "number"
        ? { awayGoals: raw.awayScore }
        : {}),
      ...(typeof raw.phase === "string" ? { phase: raw.phase } : {}),
      id: raw.id ?? raw.matchId, // keep legacy id
    };

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
 * Pause request (engine → UI) for injuries / GK incidents / ET halftime
 * ---------------------------------------------------------------------------- */

/** Overloads for pause-request (supports both call orders) */
export function broadcastPauseRequest(
  saveGameId: number,
  payload: PauseRequestPayload,
  opts?: Options
): void;
export function broadcastPauseRequest(
  payload: PauseRequestPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastPauseRequest(
  a: number | PauseRequestPayload,
  b?: PauseRequestPayload | number,
  c?: Options
) {
  // Form A: (saveGameId, payload, opts?)
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as PauseRequestPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("pause-request", payload, saveGameId, opts);
    return;
  }

  // Form B: (payload, saveGameId?, opts?)
  const payload = a as PauseRequestPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  emit("pause-request", payload, saveGameId, opts);
}

/* ----------------------------------------------------------------------------
 * ✅ New: Cup round created (services → UI)
 * ---------------------------------------------------------------------------- */

/** Overloads for cup-round-created (supports both call orders) */
export function broadcastCupRoundCreated(
  saveGameId: number,
  payload: CupRoundCreatedPayload,
  opts?: Options
): void;
export function broadcastCupRoundCreated(
  payload: CupRoundCreatedPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastCupRoundCreated(
  a: number | CupRoundCreatedPayload,
  b?: CupRoundCreatedPayload | number,
  c?: Options
) {
  // Form A: (saveGameId, payload, opts?)
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as CupRoundCreatedPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("cup-round-created", payload, saveGameId, opts);
    return;
  }

  // Form B: (payload, saveGameId?, opts?)
  const payload = a as CupRoundCreatedPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  emit("cup-round-created", payload, saveGameId, opts);
}

/* ----------------------------------------------------------------------------
 * ✅ NEW: Penalties — Shootout events
 * ---------------------------------------------------------------------------- */

/** Overloads for pk-start */
export function broadcastPkStart(
  saveGameId: number,
  payload: PKStartPayload,
  opts?: Options
): void;
export function broadcastPkStart(
  payload: PKStartPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastPkStart(
  a: number | PKStartPayload,
  b?: PKStartPayload | number,
  c?: Options
) {
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as PKStartPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("pk-start", payload, saveGameId, opts);
    return;
  }

  const payload = a as PKStartPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  emit("pk-start", payload, saveGameId, opts);
}

/** Overloads for pk-attempt */
export function broadcastPkAttempt(
  saveGameId: number,
  payload: PKAttemptPayload,
  opts?: Options
): void;
export function broadcastPkAttempt(
  payload: PKAttemptPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastPkAttempt(
  a: number | PKAttemptPayload,
  b?: PKAttemptPayload | number,
  c?: Options
) {
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as PKAttemptPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("pk-attempt", payload, saveGameId, opts);
    return;
  }

  const payload = a as PKAttemptPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  emit("pk-attempt", payload, saveGameId, opts);
}

/** Overloads for pk-end */
export function broadcastPkEnd(
  saveGameId: number,
  payload: PKEndPayload,
  opts?: Options
): void;
export function broadcastPkEnd(
  payload: PKEndPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastPkEnd(
  a: number | PKEndPayload,
  b?: PKEndPayload | number,
  c?: Options
) {
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as PKEndPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("pk-end", payload, saveGameId, opts);
    return;
  }

  const payload = a as PKEndPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  emit("pk-end", payload, saveGameId, opts);
}

/* ----------------------------------------------------------------------------
 * ✅ NEW: Penalties — Single in-match penalty events
 * ---------------------------------------------------------------------------- */

/** Overloads for penalty-awarded */
export function broadcastPenaltyAwarded(
  saveGameId: number,
  payload: PenaltyAwardedPayload,
  opts?: Options
): void;
export function broadcastPenaltyAwarded(
  payload: PenaltyAwardedPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastPenaltyAwarded(
  a: number | PenaltyAwardedPayload,
  b?: PenaltyAwardedPayload | number,
  c?: Options
) {
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as PenaltyAwardedPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("penalty-awarded", payload, saveGameId, opts);
    return;
  }

  const payload = a as PenaltyAwardedPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  emit("penalty-awarded", payload, saveGameId, opts);
}

/** Overloads for penalty-result */
export function broadcastPenaltyResult(
  saveGameId: number,
  payload: PenaltyResultPayload,
  opts?: Options
): void;
export function broadcastPenaltyResult(
  payload: PenaltyResultPayload,
  saveGameId?: number,
  opts?: Options
): void;
// impl
export function broadcastPenaltyResult(
  a: number | PenaltyResultPayload,
  b?: PenaltyResultPayload | number,
  c?: Options
) {
  if (typeof a === "number") {
    const saveGameId = a as number;
    const payload = b as PenaltyResultPayload;
    const opts = (c as Options | undefined) ?? undefined;
    emit("penalty-result", payload, saveGameId, opts);
    return;
  }

  const payload = a as PenaltyResultPayload;
  let saveGameId: number | undefined;
  let opts: Options | undefined;

  if (typeof b === "number") {
    saveGameId = b as number;
    opts = (c as Options | undefined) ?? undefined;
  } else {
    saveGameId = undefined;
    opts = (b as Options | undefined) ?? undefined;
  }

  emit("penalty-result", payload, saveGameId, opts);
}
