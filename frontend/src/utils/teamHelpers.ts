/**
 * teamHelpers.ts
 * --------------
 * Pure utility functions related to squads: grouping by position, calculating
 * average ratings, picking a default XI, etc.  No React or service-layer calls
 * allowed in this file – keep it 100 % deterministic.
 */

import { Backend } from "@/types/backend";
import { Position } from "@/types/enums";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Player = Backend.Player;

/** Object keyed by position → array of players */
export type SquadByPosition = Record<Position, Player[]>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Group an array of players into { GK:[], DF:[], MF:[], AT:[] } buckets.
 * Missing positions return an empty array so callers don’t need optional-chaining.
 */
export function groupByPosition(players: Player[]): SquadByPosition {
  return players.reduce(
    (acc, p) => {
      acc[p.position].push(p);
      return acc;
    },
    {
      GK: [] as Player[],
      DF: [] as Player[],
      MF: [] as Player[],
      AT: [] as Player[],
    }
  );
}

/** Sort players descending by rating (and value as tie-breaker). */
export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) =>
      b.rating - a.rating || // highest rating first
      b.value - a.value ||   // then market value
      a.age - b.age          // then younger
  );
}

/** Average rating of a squad (0 if empty) rounded to one decimal place. */
export function averageRating(players: Player[]): number {
  if (!players.length) return 0;
  const avg = players.reduce((sum, p) => sum + p.rating, 0) / players.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Pick a naïve starting XI: 1 GK, 4 DF, 3 MF, 3 AT
 * Returns less than 11 when the squad is undersized.
 */
export function pickStartingXI(players: Player[]): Player[] {
  const byPos = groupByPosition(sortPlayers(players));

  const xi: Player[] = [];
  const push = (arr: Player[], n: number) =>
    xi.push(...arr.slice(0, n));

  push(byPos.GK, 1);
  push(byPos.DF, 4);
  push(byPos.MF, 3);
  push(byPos.AT, 3);

  /* Fallback – fill with highest-rated leftovers if we’re still short */
  if (xi.length < 11) {
    const leftovers = players
      .filter((p) => !xi.includes(p))
      .sort((a, b) => b.rating - a.rating);
    xi.push(...leftovers.slice(0, 11 - xi.length));
  }

  return xi;
}
