// backend/src/engine/simulateMatch.ts

import { SaveGameMatch, MatchState, MatchEventType } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Socket/DTO-aligned event shape (no yellow cards in enum).
 */
export interface SimulatedMatchEvent {
  matchdayId: number;       // for grouping; caller may ignore
  minute: number;
  type: MatchEventType;     // GOAL | RED | INJURY
  description: string;      // e.g., "72' Pedro scores!"
  saveGamePlayerId: number; // SaveGamePlayer.id
}

/**
 * Simulates a single minute of a match and returns any events that occurred.
 * - ~8% chance an event happens in a given minute.
 * - On GOAL: increments SaveGameMatch.homeGoals/awayGoals atomically.
 * - Returns at most ONE event for simplicity (extend as needed).
 *
 * IMPORTANT: This function DOES NOT:
 *  - persist MatchEvent rows,
 *  - modify lineups or subs (pure sim; broadcaster handles those).
 */
export async function simulateMatch(
  match: SaveGameMatch,
  state: MatchState,
  minute: number
): Promise<SimulatedMatchEvent[]> {
  const events: SimulatedMatchEvent[] = [];

  // On-pitch player ids (SaveGamePlayer ids)
  const homePlayerIds = state.homeLineup ?? [];
  const awayPlayerIds = state.awayLineup ?? [];
  const allPlayerIds = [...homePlayerIds, ...awayPlayerIds];

  if (allPlayerIds.length === 0) return events;

  // Minimal player info (position needed to exclude GK from goals)
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: allPlayerIds } },
    select: {
      id: true,
      name: true,
      behavior: true,
      position: true,
      // NEW: we read the current injured flag so we can avoid redundant writes
      lockedUntilNextMatchday: true,
    },
  });
  if (players.length === 0) return events;

  const byId = new Map(players.map((p) => [p.id, p]));
  const isGK = (pos?: string | null) => (pos ?? "").toUpperCase() === "GK";

  // ── Event occurrence probability: ~8% per minute ───────────────────────────
  const EVENT_CHANCE = 0.08;
  if (Math.random() >= EVENT_CHANCE) return events;

  // ── Choose event type FIRST (GK must never score) ──────────────────────────
  const avgBehavior =
    players.reduce((acc, p) => acc + (p.behavior ?? 3), 0) / players.length;
  const clampedAvg = Math.min(Math.max(avgBehavior, 1), 5);

  const redWeight = 0.15 * (clampedAvg / 5); // up to 15% of events at behavior=5
  const injWeight = 0.20;                    // 20% injuries
  // Goal weight is the remainder.

  const roll = Math.random();
  let type: MatchEventType;
  if (roll < redWeight) {
    type = MatchEventType.RED;
  } else if (roll < redWeight + injWeight) {
    type = MatchEventType.INJURY;
  } else {
    type = MatchEventType.GOAL;
  }

  // ── Pick a player based on the event type ──────────────────────────────────
  const onFieldIds = allPlayerIds.filter((id) => byId.has(id));
  const goalEligibleIds = onFieldIds.filter((id) => !isGK(byId.get(id)?.position));
  const pool = type === MatchEventType.GOAL ? goalEligibleIds : onFieldIds;

  if (pool.length === 0) {
    return events;
  }

  const chosenId = pool[Math.floor(Math.random() * pool.length)];
  const chosen = byId.get(chosenId)!;
  const isHome = homePlayerIds.includes(chosenId);

  // ── Apply side effects & build description (player-named) ──────────────────
  let description = "";

  if (type === MatchEventType.GOAL) {
    await prisma.saveGameMatch.update({
      where: { id: match.id },
      data: isHome ? { homeGoals: { increment: 1 } } : { awayGoals: { increment: 1 } },
    });
    description = `${chosen.name} scores!`;
  } else if (type === MatchEventType.RED) {
    description = `${chosen.name} receives a Red card`;
    // NOTE: We do NOT remove the player from lineup here. Playing a man down is a UI/engine concern.
  } else {
    // INJURY — flag the player for next match, but DO NOT alter current lineup.
    if (!chosen.lockedUntilNextMatchday) {
      await prisma.saveGamePlayer.update({
        where: { id: chosen.id },
        data: { lockedUntilNextMatchday: true },
      });
    }
    description = `${chosen.name} is injured`;
  }

  events.push({
    matchdayId: match.matchdayId,
    minute,
    type,
    description,
    saveGamePlayerId: chosen.id,
  });

  return events;
}
