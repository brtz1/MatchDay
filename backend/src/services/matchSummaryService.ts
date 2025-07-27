// backend/src/services/matchSummaryService.ts

import prisma from '../utils/prisma';
import { getGameState } from './gameState';

export interface MatchEventRow {
  minute: number;
  type: string;
  desc: string;
}

export interface MatchSummaryRow {
  matchId: number;
  home: string;
  away: string;
  score: string; // e.g. "2 – 1"
  events: MatchEventRow[];
}

/**
 * Fetches all played matches for the current save game & matchday,
 * along with their events, and returns a summary DTO.
 */
export async function getMatchSummaries(
  matchdayId: number
): Promise<MatchSummaryRow[]> {
  // 1. Get current saveGameId
  const state = await getGameState();
  if (!state?.currentSaveGameId) {
    throw new Error('No active save game');
  }

  // 2. Fetch played saveGameMatches for this matchday
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      saveGameId: state.currentSaveGameId,
      matchdayId,
      played: true,
    },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      MatchEvent: {
        orderBy: { minute: 'asc' },
        select: { minute: true, eventType: true, description: true },
      },
    },
  });

  // 3. Build summary rows
  return matches.map((m) => {
    const homeGoals = m.homeGoals ?? 0;
    const awayGoals = m.awayGoals ?? 0;
    const score = `${homeGoals} – ${awayGoals}`;

    const events: MatchEventRow[] = m.MatchEvent.map((e) => ({
      minute: e.minute,
      type: e.eventType,
      desc: e.description,
    }));

    return {
      matchId: m.id,
      home: m.homeTeam?.name ?? 'Unknown',
      away: m.awayTeam?.name ?? 'Unknown',
      score,
      events,
    };
  });
}
