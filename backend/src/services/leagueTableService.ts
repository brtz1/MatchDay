// backend/src/services/leagueTableService.ts

import prisma from '../utils/prisma';
import { MatchdayType } from '@prisma/client';

type Result = 'win' | 'draw' | 'loss';

/**
 * Updates the LeagueTable for every match in a given matchday.
 * Only processes matchdays of type LEAGUE.
 *
 * @param saveGameId – the ID of the save game to process
 * @param matchdayId – the ID of the matchday to process
 */
export async function updateLeagueTableForMatchday(saveGameId: number, matchdayId: number): Promise<void> {
  // 1. Validate matchday exists and is LEAGUE type
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
  });

  if (!matchday) {
    throw new Error(`Matchday ${matchdayId} not found`);
  }

  if (matchday.type !== MatchdayType.LEAGUE) {
    return; // only process LEAGUE matchdays
  }

  // 2. Get all played saveGameMatches for this matchday and saveGame
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      matchdayId,
      saveGameId,
      played: true,
    },
  });

  for (const match of matches) {
    const { homeGoals, awayGoals, homeTeamId, awayTeamId } = match;
    if (homeGoals == null || awayGoals == null) {
      continue;
    }

    const homeResult = getResult(homeGoals, awayGoals);
    const awayResult = getResult(awayGoals, homeGoals);

    await upsertLeagueTableEntry(homeTeamId, homeResult, homeGoals, awayGoals);
    await upsertLeagueTableEntry(awayTeamId, awayResult, awayGoals, homeGoals);
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
 * Inserts or updates a LeagueTable row for the given saveGameTeam.
 * LeagueTable is assumed to store results keyed by saveGameTeamId.
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
