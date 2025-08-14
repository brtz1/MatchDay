import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

type MatchEventWithPlayer = Prisma.MatchEventGetPayload<{
  include: { saveGamePlayer: { select: { id: true; name: true } } };
}>;

export type EventsByMatch = Record<number, MatchEventWithPlayer[]>;

/**
 * Returns all events for a specific match (use saveGameMatchId)
 */
export async function getEventsByMatchId(matchId: number): Promise<MatchEventWithPlayer[]> {
  return prisma.matchEvent.findMany({
    where: { saveGameMatchId: matchId }, // ✅ key fix: use saveGameMatchId
    orderBy: [{ minute: 'asc' }, { id: 'asc' }],
    include: {
      saveGamePlayer: { select: { id: true, name: true } },
    },
  });
}

/**
 * Returns all events for all matches in a specific matchday (by number), grouped by matchId.
 * Uses current save-game & matchday type from GameState, then finds the matchday row,
 * then groups events by saveGameMatchId.
 */
export async function getEventsByMatchdayNumber(
  matchdayNumber: number
): Promise<EventsByMatch> {
  // Find the matchday row
  const md = await prisma.matchday.findFirst({
    where: { number: matchdayNumber },
    select: { id: true },
  });
  if (!md) return {};

  // Get matches under this matchday
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId: md.id },
    select: { id: true },
  });
  const matchIds = matches.map(m => m.id);
  if (matchIds.length === 0) return {};

  // Pull events using saveGameMatchId
  const allEvents = await prisma.matchEvent.findMany({
    where: { saveGameMatchId: { in: matchIds } }, // ✅ key fix
    orderBy: [{ minute: 'asc' }, { id: 'asc' }],
    include: {
      saveGamePlayer: { select: { id: true, name: true } },
    },
  });

  const grouped: EventsByMatch = {};
  for (const ev of allEvents) {
    if (ev.saveGameMatchId != null) {
      (grouped[ev.saveGameMatchId] ||= []).push(ev); // ✅ group by saveGameMatchId
    }
  }
  return grouped;
}
