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
 * Fetches all completed matches for the current save game & matchday,
 * along with their events, and returns a summary DTO.
 *
 * Notes:
 * - Schema has no `played` flag on SaveGameMatch; we treat a match as completed
 *   when both `homeGoals` and `awayGoals` are non-null (or >= 0).
 * - Avoids non-existent relation names like `MatchEvent`, `homeTeam`, `awayTeam`.
 *   We fetch events and team names separately and join in memory.
 */
export async function getMatchSummaries(matchdayId: number): Promise<MatchSummaryRow[]> {
  // 1) Get current saveGameId
  const state = await getGameState();
  if (!state?.currentSaveGameId) {
    throw new Error('No active save game');
  }
  const saveGameId = state.currentSaveGameId;

  // 2) Fetch completed matches for this matchday (no 'played' flag)
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      saveGameId,
      matchdayId,
      AND: [{ homeGoals: { gte: 0 } }, { awayGoals: { gte: 0 } }],
    },
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
    },
    orderBy: { id: 'asc' },
  });

  if (matches.length === 0) return [];

  // 3) Fetch events for these matches (ordered)
  const matchIds = matches.map((m) => m.id);
  const rawEvents = await prisma.matchEvent.findMany({
    where: { saveGameMatchId: { in: matchIds } },
    orderBy: { minute: 'asc' },
    select: {
      saveGameMatchId: true,
      minute: true,
      type: true,
      description: true,
    },
  });

  // Group events by match id
  const eventsByMatch = new Map<number, MatchEventRow[]>();
  for (const e of rawEvents) {
    const list = eventsByMatch.get(e.saveGameMatchId) ?? [];
    list.push({
      minute: e.minute,
      type: String(e.type),
      desc: e.description,
    });
    eventsByMatch.set(e.saveGameMatchId, list);
  }

  // 4) Resolve team names
  const teamIds = Array.from(new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId])));
  const teams = await prisma.saveGameTeam.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map<number, string>(teams.map((t) => [t.id, t.name]));

  // 5) Build summary rows
  const summaries: MatchSummaryRow[] = matches.map((m) => {
    const homeGoals = m.homeGoals ?? 0;
    const awayGoals = m.awayGoals ?? 0;
    const score = `${homeGoals} – ${awayGoals}`;

    return {
      matchId: m.id,
      home: nameById.get(m.homeTeamId) ?? String(m.homeTeamId),
      away: nameById.get(m.awayTeamId) ?? String(m.awayTeamId),
      score,
      events: eventsByMatch.get(m.id) ?? [],
    };
  });

  return summaries;
}
