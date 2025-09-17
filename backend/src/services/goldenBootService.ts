// backend/src/services/goldenBootService.ts
import prisma from '../utils/prisma';
import { MatchdayType, MatchEventType } from '@prisma/client';

export type GoldenBootScope = 'all' | 'league' | 'cup';

export interface GoldenBootRow {
  rank: number;
  saveGamePlayerId: number;
  name: string;
  teamId: number | null;
  teamName: string | null;
  position: string | null; // GK | DF | MF | AT (stored as string in your schema)
  goals: number;
}

function typeFilter(scope?: GoldenBootScope) {
  if (!scope || scope === 'all') return {};
  if (scope === 'league') return { type: MatchdayType.LEAGUE };
  if (scope === 'cup') return { type: MatchdayType.CUP };
  return {};
}

/** Highest season number for this save */
async function resolveCurrentSeason(saveGameId: number): Promise<number> {
  const row = await prisma.matchday.findFirst({
    where: { saveGameId },
    orderBy: { season: 'desc' },
    select: { season: true },
  });
  return row?.season ?? 1;
}

async function loadPlayers(saveGamePlayerIds: number[]) {
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: saveGamePlayerIds } },
    select: {
      id: true,
      name: true,
      position: true,
      team: { select: { id: true, name: true } },
    },
  });
  return new Map(players.map((p) => [p.id, p]));
}

/** Fallback: compute top scorers straight from MatchEvent (GOAL) */
async function topScorersFromEvents(opts: {
  saveGameId: number;
  season?: number;
  scope: GoldenBootScope;
  limit: number;
}): Promise<GoldenBootRow[]> {
  const { saveGameId, season, scope, limit } = opts;

  // If your enum uses a different name for goals, change this constant.
  const GOAL = MatchEventType.GOAL as MatchEventType;

  const goalRows = await prisma.matchEvent.groupBy({
    by: ['saveGamePlayerId'],
    where: {
      type: GOAL,
      saveGamePlayerId: { not: null }, // goals must belong to a player
      saveGameMatch: {
        is: {
          saveGameId,
          matchday: {
            is: {
              ...(season != null ? { season } : {}),
              ...typeFilter(scope),
            },
          },
        },
      },
    },
    // Count number of GOAL events per player
    _count: { saveGamePlayerId: true },
    // Sort by that count (use a specific field; `_all` isn’t valid here)
    orderBy: { _count: { saveGamePlayerId: 'desc' } },
    take: limit,
  });

  if (goalRows.length === 0) return [];

  const ids = goalRows.map((r) => r.saveGamePlayerId!) as number[];
  const byId = await loadPlayers(ids);

  return goalRows.map((r, idx) => {
    const p = byId.get(r.saveGamePlayerId!);
    const goals = (r._count as any)?.saveGamePlayerId ?? 0; // TS-safe read
    return {
      rank: idx + 1,
      saveGamePlayerId: r.saveGamePlayerId!,
      name: p?.name ?? `Player #${r.saveGamePlayerId}`,
      teamId: p?.team?.id ?? null,
      teamName: p?.team?.name ?? null,
      position: p?.position ?? null,
      goals,
    };
  });
}

export async function getSeasonGoldenBoot(
  saveGameId: number,
  season?: number,
  scope: GoldenBootScope = 'all',
  limit = 10
): Promise<GoldenBootRow[]> {
  const seasonValue = season ?? (await resolveCurrentSeason(saveGameId));

  // Fast path: SaveGamePlayerMatchStats
  const rows = await prisma.saveGamePlayerMatchStats.groupBy({
    by: ['saveGamePlayerId'],
    _sum: { goals: true },
    where: {
      goals: { gt: 0 },
      // player belongs to this save
      saveGamePlayer: { is: { saveGameId } },
      // filter by season & scope via matchday
      saveGameMatch: {
        is: {
          matchday: { is: { season: seasonValue, ...typeFilter(scope) } },
        },
      },
    },
    orderBy: { _sum: { goals: 'desc' } },
    take: limit,
  });

  if (rows.length > 0) {
    const ids = rows.map((r) => r.saveGamePlayerId);
    const byId = await loadPlayers(ids);

    return rows.map((r, idx) => {
      const p = byId.get(r.saveGamePlayerId);
      return {
        rank: idx + 1,
        saveGamePlayerId: r.saveGamePlayerId,
        name: p?.name ?? `Player #${r.saveGamePlayerId}`,
        teamId: p?.team?.id ?? null,
        teamName: p?.team?.name ?? null,
        position: p?.position ?? null,
        goals: r._sum?.goals ?? 0,
      };
    });
  }

  // Fallback if stats table is empty
  return topScorersFromEvents({ saveGameId, season: seasonValue, scope, limit });
}

export async function getGoldenBootHistory(
  saveGameId: number,
  scope: GoldenBootScope = 'all',
  limit = 10
): Promise<GoldenBootRow[]> {
  // Fast path: SaveGamePlayerMatchStats (across all seasons)
  const rows = await prisma.saveGamePlayerMatchStats.groupBy({
    by: ['saveGamePlayerId'],
    _sum: { goals: true },
    where: {
      goals: { gt: 0 },
      saveGamePlayer: { is: { saveGameId } },
      saveGameMatch: {
        is: {
          matchday: { is: { ...typeFilter(scope) } },
        },
      },
    },
    orderBy: { _sum: { goals: 'desc' } },
    take: limit,
  });

  if (rows.length > 0) {
    const ids = rows.map((r) => r.saveGamePlayerId);
    const byId = await loadPlayers(ids);

    return rows.map((r, idx) => {
      const p = byId.get(r.saveGamePlayerId);
      return {
        rank: idx + 1,
        saveGamePlayerId: r.saveGamePlayerId,
        name: p?.name ?? `Player #${r.saveGamePlayerId}`,
        teamId: p?.team?.id ?? null,
        teamName: p?.team?.name ?? null,
        position: p?.position ?? null,
        goals: r._sum?.goals ?? 0,
      };
    });
  }

  // Fallback if stats table is empty
  return topScorersFromEvents({ saveGameId, scope, limit });
}
