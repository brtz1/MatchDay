// backend/src/services/matchEventService.ts

import prisma from '@/utils/prisma';

/** Return type mirrors your Prisma MatchEvent model */
export async function getEventsByMatchId(matchId: number) {
  return prisma.matchEvent.findMany({
    where: { matchId },
    orderBy: { minute: 'asc' },
    include: {
      player: { select: { id: true, name: true } },
    },
  });
}
