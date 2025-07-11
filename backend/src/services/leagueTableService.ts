// src/services/leagueTableService.ts

import prisma from '../utils/prisma';
import { MatchdayType } from '@prisma/client';

type Result = 'win' | 'draw' | 'loss';

/**
 * Updates the static LeagueTable for every match in a given matchday.
 * Only processes matchdays of type LEAGUE.
 *
 * @param matchdayId – the ID of the matchday to process
 */
export async function updateLeagueTableForMatchday(matchdayId: number): Promise<void> {
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: { matches: true },
  });
  if (!matchday) {
    throw new Error(`Matchday ${matchdayId} not found`);
  }
  if (matchday.type !== MatchdayType.LEAGUE) {
    return; // only update for league rounds
  }

  for (const match of matchday.matches) {
    const { homeScore, awayScore, homeTeamId, awayTeamId } = match;
    if (homeScore == null || awayScore == null) {
      continue;
    }

    const homeResult = getResult(homeScore, awayScore);
    const awayResult = getResult(awayScore, homeScore);

    await upsertLeagueTableEntry(homeTeamId, homeResult, homeScore, awayScore);
    await upsertLeagueTableEntry(awayTeamId, awayResult, awayScore, homeScore);
  }
}

/**
 * Determines 'win' | 'draw' | 'loss' based on goals for/against.
 */
function getResult(goalsFor: number, goalsAgainst: number): Result {
  if (goalsFor > goalsAgainst) return 'win';
  if (goalsFor < goalsAgainst) return 'loss';
  return 'draw';
}

/**
 * Inserts or updates a LeagueTable row for the given team.
 */
async function upsertLeagueTableEntry(
  teamId: number,
  result: Result,
  goalsFor: number,
  goalsAgainst: number
): Promise<void> {
  const existing = await prisma.leagueTable.findUnique({ where: { teamId } });

  const played = (existing?.played ?? 0) + 1;
  const wins = (existing?.wins ?? 0) + (result === 'win' ? 1 : 0);
  const draws = (existing?.draws ?? 0) + (result === 'draw' ? 1 : 0);
  const losses = (existing?.losses ?? 0) + (result === 'loss' ? 1 : 0);
  const points = (existing?.points ?? 0) + (result === 'win' ? 3 : result === 'draw' ? 1 : 0);
  const totalGoalsFor = (existing?.goalsFor ?? 0) + goalsFor;
  const totalGoalsAgainst = (existing?.goalsAgainst ?? 0) + goalsAgainst;

  await prisma.leagueTable.upsert({
    where: { teamId },
    update: {
      played,
      wins,
      draws,
      losses,
      points,
      goalsFor: totalGoalsFor,
      goalsAgainst: totalGoalsAgainst,
    },
    create: {
      teamId,
      played,
      wins,
      draws,
      losses,
      points,
      goalsFor,
      goalsAgainst,
    },
  });
}
