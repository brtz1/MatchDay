// backend/src/engine/simulateMatch.ts

import { SaveGameMatch, MatchState, MatchEventType } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Socket/DTO-aligned event shape (no yellow cards in enum).
 * The caller (service) persists this and broadcasts it.
 */
export interface SimulatedMatchEvent {
  minute: number;
  type: MatchEventType;       // GOAL | RED | INJURY
  description: string;        // e.g., "Pedro scores!"
  saveGamePlayerId: number;   // SaveGamePlayer.id
  isHomeTeam: boolean;        // side that the player belongs to
}

/**
 * Random helper
 */
function pickOne<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Choose a player id from the lineup (prefer starters; fall back to bench if empty)
 */
async function pickPlayerFromSide(
  playerIds: number[]
): Promise<{ id: number; name: string } | null> {
  if (!playerIds || playerIds.length === 0) return null;
  const list = await prisma.saveGamePlayer.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true },
  });
  if (!list.length) return null;
  const chosen = pickOne(list)!;
  return { id: chosen.id, name: chosen.name };
}

/**
 * Given current score/state balance, bias which side the event belongs to.
 */
function chooseSideForEvent(match: SaveGameMatch): "home" | "away" {
  // Small bias toward the currently stronger/leading side
  const lead = (match.homeGoals ?? 0) - (match.awayGoals ?? 0);
  const base = 0.5 + Math.max(-0.15, Math.min(0.15, lead * 0.07)); // clamp bias
  return Math.random() < base ? "home" : "away";
}

/**
 * Minute-by-minute match simulation: maybe emit 0..N events.
 * Keep it light: 15–25% chance of any event per minute, distributed between GOAL/RED/INJURY.
 */
export async function simulateMatch(
  match: SaveGameMatch,
  state: MatchState,
  minute: number
): Promise<SimulatedMatchEvent[]> {
  const events: SimulatedMatchEvent[] = [];

  // -------------- event chance per minute ----------------
  const chance = Math.random();
  if (chance > 0.22) {
    // ~78% minutes: nothing happens
    return events;
  }

  // Decide side and player pool
  const side: "home" | "away" = chooseSideForEvent(match);
  const lineupIds = side === "home" ? state.homeLineup : state.awayLineup;
  const reservesIds = side === "home" ? state.homeReserves : state.awayReserves;

  // Prefer a starter; if empty, fall back to bench
  let player = await pickPlayerFromSide(lineupIds);
  if (!player) player = await pickPlayerFromSide(reservesIds);
  if (!player) return events; // No valid players found

  // -------------- event type split ----------------
  // heavier on GOAL, some INJURY, few RED
  const roll = Math.random();
  let type: MatchEventType;
  if (roll < 0.10) type = MatchEventType.RED;        // 10%
  else if (roll < 0.30) type = MatchEventType.INJURY; // next 20%
  else type = MatchEventType.GOAL;                    // remaining 70%

  const description =
    type === MatchEventType.GOAL
      ? `${player.name} scores!`
      : type === MatchEventType.RED
      ? `${player.name} is sent off`
      : `${player.name} is injured`;

  events.push({
    minute,
    type,
    description,
    saveGamePlayerId: player.id,
    isHomeTeam: side === "home",
  });

  return events;
}
