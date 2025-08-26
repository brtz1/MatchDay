// backend/src/services/standingsService.ts

import prisma from '../utils/prisma';
import { getGameState } from './gameState';
import { DivisionTier } from '@prisma/client';

type StandingsRowUI = {
  teamId: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  position: number;
};

type DivisionGroupUI = {
  division: string; // keep UI-friendly string
  rows: StandingsRowUI[];
};

// Only show these tiers
const ALLOWED_DIVS: DivisionTier[] = [
  DivisionTier.D1,
  DivisionTier.D2,
  DivisionTier.D3,
  DivisionTier.D4,
];

/**
 * Returns standings grouped by division for a given saveGameId (or the current active one).
 * Primary source: LeagueTable (reset on new season). If LeagueTable is empty, we fall back
 * to computing from matches (up to current matchday) so the UI still works during wiring.
 */
export async function getStandingsGrouped(saveGameId?: number): Promise<DivisionGroupUI[]> {
  // Resolve active save (currentMatchday is only needed for fallback mode)
  let activeSaveId = saveGameId;
  let currentMatchday: number | undefined;

  const gs = await getGameState().catch(() => null);
  if (!activeSaveId) {
    if (!gs?.currentSaveGameId) throw new Error('Game state not initialized');
    activeSaveId = gs.currentSaveGameId;
  }
  currentMatchday = gs?.currentMatchday ?? undefined;

  // 1) Load all teams from D1–D4 for this save
  const teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId: activeSaveId, division: { in: ALLOWED_DIVS } },
    select: { id: true, name: true, division: true },
  });

  // Build quick indexes (partial map; we don't require keys for non-allowed tiers like DIST)
  const byDivision: Partial<Record<DivisionTier, { id: number; name: string }[]>> = {};
  for (const t of teams) {
    if (ALLOWED_DIVS.includes(t.division)) {
      if (!byDivision[t.division]) byDivision[t.division] = [];
      byDivision[t.division]!.push({ id: t.id, name: t.name });
    }
  }

  // 2) Try to fetch LeagueTable rows for these teams
  const teamIds = teams.map((t) => t.id);
  const leagueRows = teamIds.length
    ? await prisma.leagueTable.findMany({
        where: { teamId: { in: teamIds } },
        select: {
          teamId: true,
          played: true,
          wins: true,
          draws: true,
          losses: true,
          goalsFor: true,
          goalsAgainst: true,
          points: true,
        },
      })
    : [];

  const rowsByTeam = new Map(leagueRows.map((r) => [r.teamId, r]));
  const useFallback = leagueRows.length === 0;

  // 3) Build per-division rows
  const result: DivisionGroupUI[] = [];

  for (const div of ALLOWED_DIVS) {
    const teamsInDiv = byDivision[div] ?? [];
    let rows: StandingsRowUI[] = [];

    if (!useFallback) {
      // Preferred: read from LeagueTable, zero-fill missing teams
      rows = teamsInDiv.map(({ id, name }) => {
        const r = rowsByTeam.get(id);
        const played = r?.played ?? 0;
        const wins = r?.wins ?? 0;
        const draws = r?.draws ?? 0;
        const losses = r?.losses ?? 0;
        const gf = r?.goalsFor ?? 0;
        const ga = r?.goalsAgainst ?? 0;
        const points = r?.points ?? 0;
        const gd = gf - ga;
        return {
          teamId: id,
          name,
          played,
          wins,
          draws,
          losses,
          gf,
          ga,
          gd,
          points,
          position: 0, // set after sort
        };
      });
    } else {
      // Fallback: compute from matches up to currentMatchday
      if (currentMatchday == null || currentMatchday < 1) {
        rows = teamsInDiv.map(({ id, name }) => ({
          teamId: id,
          name,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
          position: 0,
        }));
      } else {
        const matchdays = await prisma.matchday.findMany({
          where: { saveGameId: activeSaveId, number: { lte: currentMatchday } },
          select: { id: true },
        });
        const matchdayIds = matchdays.map((md) => md.id);

        // IMPORTANT: include matches even if goals are NULL (we coalesce to 0 below)
        const matches = matchdayIds.length
          ? await prisma.saveGameMatch.findMany({
              where: {
                saveGameId: activeSaveId,
                matchdayId: { in: matchdayIds },
              },
              select: {
                homeTeamId: true,
                awayTeamId: true,
                homeGoals: true,
                awayGoals: true,
              },
            })
          : [];

        const setIds = new Set(teamsInDiv.map((t) => t.id));
        const agg = new Map<number, Omit<StandingsRowUI, 'gd' | 'position'>>();

        for (const { id, name } of teamsInDiv) {
          agg.set(id, {
            teamId: id,
            name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            gf: 0,
            ga: 0,
            points: 0,
          });
        }

        for (const m of matches) {
          const hg = m.homeGoals ?? 0;
          const ag = m.awayGoals ?? 0;

          if (setIds.has(m.homeTeamId) && setIds.has(m.awayTeamId)) {
            const home = agg.get(m.homeTeamId)!;
            const away = agg.get(m.awayTeamId)!;

            home.played += 1;
            away.played += 1;

            home.gf += hg;
            home.ga += ag;
            away.gf += ag;
            away.ga += hg;

            if (hg > ag) {
              home.wins += 1;
              home.points += 3;
              away.losses += 1;
            } else if (hg < ag) {
              away.wins += 1;
              away.points += 3;
              home.losses += 1;
            } else {
              home.draws += 1;
              away.draws += 1;
              home.points += 1;
              away.points += 1;
            }
          }
        }

        rows = Array.from(agg.values()).map((t) => ({
          ...t,
          gd: t.gf - t.ga,
          position: 0, // set after sort
        }));
      }
    }

    // Sort: Points desc, GD desc, GF desc, Name asc
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gd;
      const gdB = b.gd;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });

    // Assign positions
    rows = rows.map((r, i) => ({ ...r, position: i + 1 }));

    result.push({ division: String(div), rows });
  }

  return result;
}
