// backend/src/services/matchEventService.ts

import prisma from "../utils/prisma";
import { Prisma, MatchEventType } from "@prisma/client";
import { getGameState } from "./gameState";

/* --------------------------------------------------------------------------------
 * Prisma payloads
 * -------------------------------------------------------------------------------*/
type MatchEventWithPlayer = Prisma.MatchEventGetPayload<{
  include: { saveGamePlayer: { select: { id: true; name: true } } };
}>;

export type EventsByMatch = Record<number, MatchEventWithPlayer[]>;

/* --------------------------------------------------------------------------------
 * DTOs to match frontend/socket payloads
 * -------------------------------------------------------------------------------*/
export type MatchEventDTO = {
  matchId: number;
  minute: number;
  type: MatchEventType | string; // keep string-compatible if enums diverge
  description: string;
  player?: { id: number; name: string } | null;
};

export type EventsByMatchDTO = Record<number, MatchEventDTO[]>;

function toEventDTO(e: MatchEventWithPlayer): MatchEventDTO {
  return {
    matchId: e.saveGameMatchId!,
    minute: e.minute,
    type: e.type,
    description: e.description,
    player: e.saveGamePlayer ? { id: e.saveGamePlayer.id, name: e.saveGamePlayer.name } : null,
  };
}

/* =================================================================================
 * RAW SHAPES (keep existing function signatures/returns)
 * =================================================================================*/

/**
 * Returns all events for a specific match (keyed by SaveGameMatch.id)
 */
export async function getEventsByMatchId(matchId: number): Promise<MatchEventWithPlayer[]> {
  return prisma.matchEvent.findMany({
    where: { saveGameMatchId: matchId },
    orderBy: [{ minute: "asc" }, { id: "asc" }],
    include: {
      saveGamePlayer: { select: { id: true, name: true } },
    },
  });
}

/**
 * Returns all events for all matches in a specific matchday (by matchdayId),
 * grouped by saveGameMatchId.
 */
export async function getEventsByMatchdayId(matchdayId: number): Promise<EventsByMatch> {
  // Find all SaveGameMatch ids in this matchday
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);
  if (matchIds.length === 0) return {};

  // Fetch all events for those matches
  const allEvents = await prisma.matchEvent.findMany({
    where: { saveGameMatchId: { in: matchIds } },
    orderBy: [{ minute: "asc" }, { id: "asc" }],
    include: {
      saveGamePlayer: { select: { id: true, name: true } },
    },
  });

  // Group by saveGameMatchId
  const grouped: EventsByMatch = {};
  for (const ev of allEvents) {
    if (ev.saveGameMatchId != null) {
      (grouped[ev.saveGameMatchId] ||= []).push(ev);
    }
  }
  return grouped;
}

/**
 * Returns all events for all matches in a specific matchday (by matchday number),
 * using the current save and stage from GameState, grouped by saveGameMatchId.
 */
export async function getEventsByMatchdayNumber(matchdayNumber: number): Promise<EventsByMatch> {
  const gs = await getGameState();
  if (!gs?.currentSaveGameId) return {};

  // Resolve the concrete Matchday row for this save + number + type
  const matchday = await prisma.matchday.findFirst({
    where: {
      saveGameId: gs.currentSaveGameId,
      number: matchdayNumber,
      type: gs.matchdayType, // ✅ filter by type to avoid CUP vs LEAGUE mixups
    },
    select: { id: true },
    orderBy: { id: "desc" }, // pick most recent if duplicates exist
  });

  if (!matchday) return {};
  return getEventsByMatchdayId(matchday.id);
}

/* =================================================================================
 * DTO CONVENIENCE (FE-friendly shapes to align with socket payloads)
 * =================================================================================*/

export async function getEventsByMatchIdDTO(matchId: number): Promise<MatchEventDTO[]> {
  const raw = await getEventsByMatchId(matchId);
  return raw.map(toEventDTO);
}

export async function getEventsByMatchdayIdDTO(matchdayId: number): Promise<EventsByMatchDTO> {
  const grouped = await getEventsByMatchdayId(matchdayId);
  const dto: EventsByMatchDTO = {};
  for (const [k, arr] of Object.entries(grouped)) {
    dto[Number(k)] = arr.map(toEventDTO);
  }
  return dto;
}

export async function getEventsByMatchdayNumberDTO(
  matchdayNumber: number
): Promise<EventsByMatchDTO> {
  const gs = await getGameState();
  if (!gs?.currentSaveGameId) return {};

  const matchday = await prisma.matchday.findFirst({
    where: {
      saveGameId: gs.currentSaveGameId,
      number: matchdayNumber,
      type: gs.matchdayType, // ✅ keep consistent with current stage
    },
    select: { id: true },
    orderBy: { id: "desc" },
  });

  if (!matchday) return {};
  return getEventsByMatchdayIdDTO(matchday.id);
}
