// backend/src/services/standingsService.ts

import prisma from '../utils/prisma';
import { getGameState } from './gameState';

export interface StandingRow {
  teamId: number;
  name: string;
  division: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface DivisionStanding {
  division: string;
  teams: StandingRow[];
}

/**
 * Returns standings grouped by division for a given saveGameId (or the current one).
 */
export async function getStandingsGrouped(saveGameId?: number): Promise<DivisionStanding[]> {
  // 1) Use provided saveGameId or get from current game state
  let finalSaveGameId = saveGameId;
  let currentMatchday: number | undefined;

  if (!finalSaveGameId) {
    const state = await getGameState();
    if (!state?.currentSaveGameId || state.currentMatchday == null) {
      throw new Error('Game state not initialized');
    }
    finalSaveGameId = state.currentSaveGameId;
    currentMatchday = state.currentMatchday;
  } else {
    const state = await getGameState();
    currentMatchday = state?.currentMatchday;
  }

  if (currentMatchday == null) throw new Error('Matchday not set');

  // 2) Fetch all teams for this save, ordered by division
  const teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId: finalSaveGameId },
    select: { id: true, name: true, division: true },
  });

  // 3) Get all played matches up to current matchday
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      saveGameId: finalSaveGameId,
      played: true,
      matchdayId: { lte: currentMatchday },
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  // 4) Init stats per team
  const statsMap: Record<number, StandingRow> = {};
  for (const t of teams) {
    statsMap[t.id] = {
      teamId: t.id,
      name: t.name,
      division: t.division,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  }

  // 5) Calculate standings stats
  for (const m of matches) {
    const home = statsMap[m.homeTeamId];
    const away = statsMap[m.awayTeamId];
    if (!home || !away) continue;

    home.played++;
    away.played++;

    home.goalsFor += m.homeGoals ?? 0;
    home.goalsAgainst += m.awayGoals ?? 0;
    away.goalsFor += m.awayGoals ?? 0;
    away.goalsAgainst += m.homeGoals ?? 0;

    if ((m.homeGoals ?? 0) > (m.awayGoals ?? 0)) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if ((m.homeGoals ?? 0) < (m.awayGoals ?? 0)) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.draw++;
      home.points += 1;
      away.draw++;
      away.points += 1;
    }
  }

  // 6) Add GD and group by division
  const teamsByDivision: Record<string, StandingRow[]> = {};
  for (const row of Object.values(statsMap)) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    if (!teamsByDivision[row.division]) teamsByDivision[row.division] = [];
    teamsByDivision[row.division].push(row);
  }

  // 7) Sort each division's teams (Pts, GD, GF, Name)
  const grouped: DivisionStanding[] = Object.entries(teamsByDivision)
    .filter(([division]) => ["D1", "D2", "D3", "D4"].includes(division))
    .map(([division, teams]) => {
      const sorted = teams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.name.localeCompare(b.name);
      });
      return { division, teams: sorted };
    });

  // 8) Sort divisions in order
  grouped.sort((a, b) =>
    a.division.localeCompare(b.division, undefined, { numeric: true })
  );

  return grouped;
}
