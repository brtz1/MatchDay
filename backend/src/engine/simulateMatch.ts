// backend/src/engine/simulateMatch.ts

import { SaveGameMatch, MatchState, MatchEventType } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Socket/DTO-aligned event shape (no yellow cards in enum).
 * The caller (service) persists this and broadcasts it.
 * NOTE:
 *  - For RED cards we set removeFromLineup=true (sent off).
 *  - For INJURY we DO NOT auto-remove anymore; coach decides via FE.
 */
export interface SimulatedMatchEvent {
  minute: number;
  type: MatchEventType;       // GOAL | RED | INJURY
  description: string;        // e.g., "⚽️ Pedro scores!"
  saveGamePlayerId: number;   // SaveGamePlayer.id
  isHomeTeam: boolean;        // side that the player belongs to

  // --- Optional helpers for enforcement/UI (won’t break old callers) ---
  position?: string | null;   // "GK" | "DF" | "MF" | "AT"
  isGK?: boolean;             // convenience flag
  /** For RED we use true; for INJURY we now leave this undefined/false. */
  removeFromLineup?: boolean;

  /**
   * Aligned with FE PauseReason:
   * "INJURY" | "GK_INJURY" | "GK_RED_NEEDS_GK"
   * Caller decides whether to actually pause (e.g., only for coached team).
   */
  pauseReason?: "INJURY" | "GK_INJURY" | "GK_RED_NEEDS_GK";
}

/* -------------------------------------------------------------------------- */
/* NEW: Penalty-awarded signal                                                */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight signal (not a DB MatchEvent) letting the service layer know a
 * penalty should be taken right now. The service decides whether to emit
 * `penalty-awarded` and pause (coached team), or resolve instantly otherwise.
 */
export interface PenaltyAwardedSignal {
  kind: "PENALTY_AWARDED";
  minute: number;
  isHomeTeam: boolean;
  /** Outfield lineup candidates on the awarded side, sorted AT→MF→DF then rating desc. */
  candidates: Array<{ id: number; name: string; position?: string | null; rating?: number }>;
  /** Convenience: the recommended shooter id (top of `candidates`), or null if none. */
  defaultShooterId: number | null;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type PlayerPick = { id: number; name: string; position?: string | null };

function pickOne<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fetch players (id, name, position) for a given set of ids. */
async function fetchPlayersByIds(ids: number[]): Promise<PlayerPick[]> {
  if (!ids || ids.length === 0) return [];
  const rows = await prisma.saveGamePlayer.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, position: true },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, position: r.position }));
}

/** Fetch players with rating (used for PK candidate sorting). */
async function fetchPlayersByIdsWithRating(ids: number[]) {
  if (!ids || ids.length === 0) return [];
  return prisma.saveGamePlayer.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, position: true, rating: true },
  });
}

const isGK = (pos?: string | null) => {
  const p = (pos ?? "").toUpperCase();
  return p === "GK" || p === "GOALKEEPER";
};

/** AT → MF → DF priority (PK takers exclude GK entirely). */
function positionBucket(p?: string | null): number {
  const pos = (p ?? "").toUpperCase();
  if (pos === "AT") return 0;
  if (pos === "MF") return 1;
  if (pos === "DF") return 2;
  if (pos === "GK" || pos === "GOALKEEPER") return 99;
  return 9;
}

function sortPkCandidates(
  a: { position?: string | null; rating?: number; name?: string | null; id: number },
  b: { position?: string | null; rating?: number; name?: string | null; id: number }
) {
  const ba = positionBucket(a.position);
  const bb = positionBucket(b.position);
  if (ba !== bb) return ba - bb;

  const ra = typeof a.rating === "number" ? a.rating : -1;
  const rb = typeof b.rating === "number" ? b.rating : -1;
  if (ra !== rb) return rb - ra;

  const na = (a.name ?? "").localeCompare(b.name ?? "");
  if (na !== 0) return na;
  return a.id - b.id;
}

/**
 * Given current score/state balance, bias which side the event belongs to.
 * Tiny lean to the leading side; otherwise near 50/50.
 */
function chooseSideForEvent(match: SaveGameMatch): "home" | "away" {
  const lead = (match.homeGoals ?? 0) - (match.awayGoals ?? 0);
  const base = 0.5 + Math.max(-0.15, Math.min(0.15, lead * 0.07)); // clamp bias
  return Math.random() < base ? "home" : "away";
}

/* -------------------------------------------------------------------------- */
/* Simulation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Minute-by-minute match simulation: maybe emit 0..N events.
 * ~7% chance of an event per minute (tweak as desired).
 *
 * Rules:
 * - GOAL: only from lineup non-GK. If only GKs on field, suppress goal.
 * - RED / INJURY: only from lineup (bench is safe).
 * - RED: removeFromLineup=true; GK reds add pauseReason="GK_RED_NEEDS_GK".
 * - INJURY: DO NOT auto-remove; include pauseReason ("INJURY" or "GK_INJURY") for FE.
 * - If the match state is paused, emit nothing this tick.
 */
export async function simulateMatch(
  match: SaveGameMatch,
  state: MatchState,
  minute: number
): Promise<SimulatedMatchEvent[]> {
  const events: SimulatedMatchEvent[] = [];

  // Hard pause: if state is paused, no events should be generated
  if ((state as any)?.isPaused) {
    return events;
  }

  // -------------- event chance per minute ----------------
  const chance = Math.random();
  if (chance > 0.07) {
    return events;
  }

  // Decide side and gather player pools (we only use **lineup** for all event types)
  const side: "home" | "away" = chooseSideForEvent(match);
  const lineupIds = (side === "home" ? state.homeLineup : state.awayLineup) ?? [];

  // Fetch metadata (name/position) for starters on that side
  const lineupPlayers = await fetchPlayersByIds(lineupIds);

  // -------------- event type split ----------------
  // heavier on GOAL, some INJURY, few RED
  const roll = Math.random();
  let type: MatchEventType;
  if (roll < 0.10) type = MatchEventType.RED;         // 10%
  else if (roll < 0.30) type = MatchEventType.INJURY; // next 20%
  else type = MatchEventType.GOAL;                    // remaining 70%

  // Choose player with constraints:
  // - For GOAL: only lineup non-GK. If none, suppress.
  // - For RED/INJURY: only lineup.
  let candidate: PlayerPick | null = null;

  if (type === MatchEventType.GOAL) {
    const onPitchNoGK = lineupPlayers.filter((p) => !isGK(p.position));
    candidate = pickOne(onPitchNoGK);
    if (!candidate) {
      // No eligible outfield player → suppress goal this minute
      return events;
    }
  } else {
    // RED / INJURY must affect someone actually on the field
    candidate = pickOne(lineupPlayers);
    if (!candidate) return events; // safety guard
  }

  const pos = (candidate.position ?? "").toUpperCase() || null;
  const gk = isGK(pos);

  // Build human-friendly text
  const posTag = pos ? ` (${pos})` : "";
  const description =
    type === MatchEventType.GOAL
      ? `⚽️ ${candidate.name} scores!`
      : type === MatchEventType.RED
      ? `🟥 ${candidate.name}${posTag} is sent off`
      : `🚑 ${candidate.name}${posTag} is injured`;

  // Compose event with UI hints
  const ev: SimulatedMatchEvent = {
    minute,
    type,
    description,
    saveGamePlayerId: candidate.id,
    isHomeTeam: side === "home",
    position: pos,
    isGK: gk,
  };

  if (type === MatchEventType.RED) {
    // Red card: remove now; GK red also asks FE to force a GK on
    ev.removeFromLineup = true;
    if (gk) {
      ev.pauseReason = "GK_RED_NEEDS_GK";
    }
  } else if (type === MatchEventType.INJURY) {
    // Injury: do NOT auto-remove anymore; coach decides in FE.
    // Keep pause hint so the caller can pause only if it’s the coached team.
    ev.pauseReason = gk ? "GK_INJURY" : "INJURY";
    // ev.removeFromLineup = false; // ← intentionally omitted
  }

  events.push(ev);
  return events;
}

/* -------------------------------------------------------------------------- */
/* NEW: Penalty-awarded generator (call from matchService each minute)        */
/* -------------------------------------------------------------------------- */

/**
 * Maybe award a penalty this minute.
 * - Returns null most of the time.
 * - When it triggers, returns a PenaltyAwardedSignal with sorted candidate PK takers
 *   (outfield players on the awarded side’s CURRENT lineup; GK excluded).
 *
 * Caller expectation (service layer):
 *  - If the coached team is awarded: emit `penalty-awarded` and pause until /pk/take.
 *  - Else: pick `defaultShooterId` and call penaltyService.resolveMatchPenalty().
 */
export async function maybeAwardPenalty(
  match: SaveGameMatch,
  state: MatchState,
  minute: number
): Promise<PenaltyAwardedSignal | null> {
  // If paused, don't trigger anything new
  if ((state as any)?.isPaused) return null;

  // Very rare per-minute chance (≈ 0.6 per 90 minutes)
  const PENALTY_PROB_PER_MINUTE = 0.006;
  if (Math.random() > PENALTY_PROB_PER_MINUTE) return null;

  // Decide which side attacks (small bias towards the leader)
  const side = chooseSideForEvent(match);
  const isHomeTeam = side === "home";
  const lineupIds = (isHomeTeam ? state.homeLineup : state.awayLineup) ?? [];
  if (!lineupIds.length) return null;

  // Fetch lineup players with rating and filter to outfield only
  const players = await fetchPlayersByIdsWithRating(lineupIds);
  const outfield = players.filter((p) => !isGK(p.position));
  if (!outfield.length) return null;

  // Sort candidates AT→MF→DF, then rating desc, then name/id
  outfield.sort(sortPkCandidates);

  return {
    kind: "PENALTY_AWARDED",
    minute,
    isHomeTeam,
    candidates: outfield,
    defaultShooterId: outfield[0]?.id ?? null,
  };
}
