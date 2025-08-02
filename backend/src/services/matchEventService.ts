import prisma from '../utils/prisma';

/**
 * Returns all events for a specific match
 */
export async function getEventsByMatchId(matchId: number) {
  return prisma.matchEvent.findMany({
    where: { matchId },
    orderBy: { minute: 'asc' },
    include: {
      saveGamePlayer: { select: { id: true, name: true } },
    },
  });
}

/**
 * Returns all events for all matches in a specific matchday, grouped by matchId
 */
export async function getEventsByMatchdayId(matchdayId: number) {
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId },
    select: { id: true },
  });

  const matchIds = matches.map((m) => m.id);

  const allEvents = await prisma.matchEvent.findMany({
    where: {
      matchId: { in: matchIds },
    },
    orderBy: { minute: 'asc' },
    include: {
      saveGamePlayer: { select: { id: true, name: true } },
    },
  });

  // Group by matchId
const grouped: Record<number, typeof allEvents> = {};
for (const event of allEvents) {
  if (event.matchId != null) { // ✅ ensure it's a number
    if (!grouped[event.matchId]) {
      grouped[event.matchId] = [];
    }
    grouped[event.matchId].push(event);
  }
}
return grouped;

}
