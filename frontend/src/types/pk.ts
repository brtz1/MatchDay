// frontend/src/types/pk.ts
//
// Shared TypeScript types for Penalty Kicks (PK) — covering both
// in-match single penalties and full shootouts. Keep this file
// runtime-free (types/interfaces only).

/* ------------------------------------------------------------------------- */
/* Core domain types                                                          */
/* ------------------------------------------------------------------------- */

export type Position = "GK" | "DF" | "MF" | "AT";

export type PkOutcome = "GOAL" | "MISS" | "SAVE";

export interface Score {
  home: number;
  away: number;
}

/** Minimal player shape commonly used by PK UI (lineup lists, etc.) */
export interface PlayerLite {
  id: number;
  name: string;
  position: Position;
  rating: number; // 1..99
  /** Mark if currently on the pitch (helpful for auto-pickers) */
  onPitch?: boolean;
}

/** Minimal shooter info used in pre-ordered shootout taker lists */
export interface ShooterBrief {
  id: number;
  name?: string;
  position?: Position;
  rating?: number;
}

/** Alias if you prefer this naming in UI components */
export type Shooter = ShooterBrief;

/* ------------------------------------------------------------------------- */
/* Shootout state + socket payloads                                          */
/* ------------------------------------------------------------------------- */

/** A pre-ordered taker list for one team */
export interface TeamOrder {
  /** SaveGameTeam.id (or team id used in your shootout engine) */
  id: number;
  name: string;
  /** Pre-ordered by AT→MF→DF, rating desc (server-side) */
  shooters: ShooterBrief[];
}

/** One interleaved shootout attempt */
export interface PkAttempt {
  matchId: number;
  /** true = home side took the shot; false = away side */
  isHome: boolean;
  /** SaveGamePlayer.id of the shooter */
  shooterId: number;
  /** Optional redundant display name (server may provide) */
  shooterName?: string;
  /** 0-based index within that team's order (0..n) */
  shotIndex: number;
  /** Outcome of this kick */
  outcome: PkOutcome;
  /** Live tally right after this attempt */
  tally: Score;
  /** Some engines send either or both flags; consumers can check either */
  decided?: boolean;
  decisive?: boolean;
}

/** Initial shootout payload */
export interface PkStartPayload {
  matchId: number;
  home: TeamOrder;
  away: TeamOrder;
}

/** End of shootout payload */
export interface PkEndPayload {
  matchId: number;
  winnerTeamId: number;
  tally: Score;
}

/** Full, reload-safe shootout state (for GET /pk/state) */
export interface PkShootoutState {
  matchId: number;
  home: TeamOrder;
  away: TeamOrder;
  attempts: PkAttempt[];
  end?: PkEndPayload | null;
}

/* ------------------------------------------------------------------------- */
/* In-match single penalty flow payloads                                     */
/* ------------------------------------------------------------------------- */

/** Emitted when a penalty is awarded during live simulation */
export interface PenaltyAwardedPayload {
  matchId: number;
  /** side that was awarded the kick */
  isHome: boolean;
}

/** Emitted after resolving an in-match penalty */
export interface PenaltyResultPayload {
  matchId: number;
  isHome: boolean;
  shooterId: number;
  outcome: PkOutcome;
  /** New match score after applying the penalty, if it was a goal */
  newScore?: Score;
}

/* ------------------------------------------------------------------------- */
/* REST DTOs used by pkService                                                */
/* ------------------------------------------------------------------------- */

export interface TakePenaltyRequest {
  saveGameId: number;
  matchId: number;
  shooterId: number;
}

export interface TakePenaltyResponse {
  outcome: PkOutcome;
  newScore?: Score;
}

export interface AckShootoutRequest {
  saveGameId: number | null;
  matchId: number | null;
}

/* ------------------------------------------------------------------------- */
/* Socket event names (string literal unions)                                */
/* ------------------------------------------------------------------------- */

export type PkStartEventName = "pk-start";
export type PkAttemptEventName = "pk-attempt";
export type PkEndEventName = "pk-end";
export type PenaltyAwardedEventName = "penalty-awarded";
export type PenaltyResultEventName = "penalty-result";

export type PkSocketEventName =
  | PkStartEventName
  | PkAttemptEventName
  | PkEndEventName
  | PenaltyAwardedEventName
  | PenaltyResultEventName;

/* ------------------------------------------------------------------------- */
/* Optional: Game stage union with penalties (frontend-only)                 */
/* ------------------------------------------------------------------------- */

/** If your GameStage includes a penalties screen state, use this union. */
export type GameStageWithPenalties =
  | "ACTION"
  | "MATCHDAY"
  | "HALFTIME"
  | "RESULTS"
  | "STANDINGS"
  | "PENALTIES";
