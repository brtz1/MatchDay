// backend/src/services/standingsService.ts

import prisma from '../utils/prisma';
import { getGameState } from './gameState';
import { DivisionTier, MatchdayType } from '@prisma/client';
import { broadcastStageChanged /* optional */, broadcastStandingsUpdated } from '../sockets/broadcast';

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

/* -------------------------------------------------------------------------- */
/* NEW: finalizeStandings – recompute LeagueTable and broadcast               */
/* -------------------------------------------------------------------------- */

/**
 * Recomputes the LeagueTable for D1–D4 from all **played LEAGUE** matches
 * up to the current matchday, upserting rows for every team in those divisions.
 * Emits a 'standings-updated' socket event for the save, and returns coachTeamId
 * (to satisfy the FE finalizeStandings() caller).
 */
export async function finalizeStandings(saveGameId?: number): Promise<{ coachTeamId: number | null }> {
  // Resolve active save + matchday + coach
  const gs = await getGameState().catch(() => null);
  const activeSaveId = typeof saveGameId === 'number' ? saveGameId : gs?.currentSaveGameId;
  if (!activeSaveId) throw new Error('Game state not initialized');
  const currentMatchday = gs?.currentMatchday ?? 0;
  const coachTeamId = gs?.coachTeamId ?? null;

  // Teams in allowed divisions
  const teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId: activeSaveId, division: { in: ALLOWED_DIVS } },
    select: { id: true, name: true, division: true },
  });
  const teamIds = teams.map(t => t.id);
  const byId = new Map(teams.map(t => [t.id, t]));

  // All LEAGUE matchdays up to current
  const matchdays = await prisma.matchday.findMany({
    where: {
      saveGameId: activeSaveId,
      number: { lte: currentMatchday },
      type: MatchdayType.LEAGUE,
    },
    select: { id: true },
  });
  const matchdayIds = matchdays.map(md => md.id);

  // Matches that belong to those matchdays (coalesce null goals to 0, but prefer isPlayed=true)
  const matches = matchdayIds.length
    ? await prisma.saveGameMatch.findMany({
        where: {
          saveGameId: activeSaveId,
          matchdayId: { in: matchdayIds },
          // After your flow ends at 90', you set isPlayed=true; keep it explicit:
          isPlayed: true,
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeGoals: true,
          awayGoals: true,
        },
      })
    : [];

  // Aggregate per team (only count teams within allowed divisions)
  type Agg = {
    played: number; wins: number; draws: number; losses: number;
    gf: number; ga: number; points: number;
  };
  const agg = new Map<number, Agg>();

  for (const t of teams) {
    agg.set(t.id, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 });
  }

  for (const m of matches) {
    const hg = m.homeGoals ?? 0;
    const ag = m.awayGoals ?? 0;

    const homeAllowed = byId.has(m.homeTeamId);
    const awayAllowed = byId.has(m.awayTeamId);
    if (!homeAllowed || !awayAllowed) continue;

    const home = agg.get(m.homeTeamId)!;
    const away = agg.get(m.awayTeamId)!;

    home.played += 1;
    away.played += 1;

    home.gf += hg; home.ga += ag;
    away.gf += ag; away.ga += hg;

    if (hg > ag) {
      home.wins += 1; home.points += 3;
      away.losses += 1;
    } else if (hg < ag) {
      away.wins += 1; away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1; away.draws += 1;
      home.points += 1; away.points += 1;
    }
  }

  // Upsert LeagueTable rows for all D1–D4 teams
  await prisma.$transaction(
    teams.map(t =>
      prisma.leagueTable.upsert({
        where: { teamId: t.id }, // assumes unique on teamId
        create: {
          teamId: t.id,
          played: agg.get(t.id)?.played ?? 0,
          wins: agg.get(t.id)?.wins ?? 0,
          draws: agg.get(t.id)?.draws ?? 0,
          losses: agg.get(t.id)?.losses ?? 0,
          goalsFor: agg.get(t.id)?.gf ?? 0,
          goalsAgainst: agg.get(t.id)?.ga ?? 0,
          points: agg.get(t.id)?.points ?? 0,
        },
        update: {
          played: agg.get(t.id)?.played ?? 0,
          wins: agg.get(t.id)?.wins ?? 0,
          draws: agg.get(t.id)?.draws ?? 0,
          losses: agg.get(t.id)?.losses ?? 0,
          goalsFor: agg.get(t.id)?.gf ?? 0,
          goalsAgainst: agg.get(t.id)?.ga ?? 0,
          points: agg.get(t.id)?.points ?? 0,
        },
      })
    )
  );

  // 🔔 Notify clients on that save to refetch immediately
  try {
    broadcastStandingsUpdated(activeSaveId, { saveGameId: activeSaveId });
  } catch {
    // Optional fallback: bounce a no-op stage-changed to RESULTS to trigger refetch listeners
    try {
      broadcastStageChanged({ gameStage: 'RESULTS', matchdayNumber: currentMatchday }, activeSaveId);
    } catch { /* ignore */ }
  }

  return { coachTeamId };
}

/* -------------------------------------------------------------------------- */
/* Existing grouped fetch (unchanged)                                         */
/* -------------------------------------------------------------------------- */

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

  const result: DivisionGroupUI[] = [];

  for (const div of ALLOWED_DIVS) {
    const teamsInDiv = byDivision[div] ?? [];
    let rows: StandingsRowUI[] = [];

    if (!useFallback) {
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
          position: 0,
        };
      });
    } else {
      // Fallback: compute from matches up to currentMatchday (any null goals treated as 0)
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
          where: { saveGameId: activeSaveId, number: { lte: currentMatchday }, type: MatchdayType.LEAGUE },
          select: { id: true },
        });
        const matchdayIds = matchdays.map((md) => md.id);

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
          position: 0,
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
