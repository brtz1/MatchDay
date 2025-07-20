// backend/src/services/standingsService.ts

import prisma from '@/utils/prisma';
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

export async function getStandings(): Promise<StandingRow[]> {
  // 1) fetch current saveGameId and matchday
  const { currentSaveGameId, currentMatchday } = await getGameState();
  if (!currentSaveGameId || currentMatchday == null) {
    throw new Error('Game state not initialized');
  }

  // 2) fetch all teams in this save
  const teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId: currentSaveGameId },
    select: { id: true, name: true, division: true },
  });

  // 3) fetch all played matches up through currentMatchday
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      saveGameId: currentSaveGameId,
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

  // 4) initialize stats map
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

  // 5) accumulate match results
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
      home.won++; home.points += 3;
      away.lost++;
    } else if ((m.homeGoals ?? 0) < (m.awayGoals ?? 0)) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.draw++; home.points += 1;
      away.draw++; away.points += 1;
    }
  }

  // 6) compute GD and sort
  const standings = Object.values(statsMap).map(r => ({
    ...r,
    goalDifference: r.goalsFor - r.goalsAgainst,
  }));

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

  return standings;
}
