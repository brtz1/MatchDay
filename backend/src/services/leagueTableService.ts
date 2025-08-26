import prisma from '../utils/prisma';
import { MatchdayType, DivisionTier, Prisma } from '@prisma/client';

type Result = 'win' | 'draw' | 'loss';

// Only divisions shown in standings contribute to league table
const ALLOWED_DIVS: DivisionTier[] = [
  DivisionTier.D1,
  DivisionTier.D2,
  DivisionTier.D3,
  DivisionTier.D4,
];

/**
 * Updates the LeagueTable for every match in a given matchday.
 * Only processes matchday of type LEAGUE and teams in D1–D4.
 *
 * Strictly scoped to the provided saveGameId (no cross-save leakage).
 *
 * @param saveGameId – the ID of the save game to process
 * @param matchdayId – the ID of the matchday to process
 */
export async function updateLeagueTableForMatchday(
  saveGameId: number,
  matchdayId: number
): Promise<void> {
  // 1) Validate matchday exists, belongs to this save, and is LEAGUE
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { id: true, type: true, saveGameId: true },
  });

  if (!matchday) {
    throw new Error(`Matchday ${matchdayId} not found`);
  }
  if (matchday.saveGameId !== saveGameId) {
    throw new Error(
      `Matchday ${matchdayId} does not belong to saveGameId ${saveGameId}`
    );
  }
  if (matchday.type !== MatchdayType.LEAGUE) {
    // Only league rounds contribute to the league table
    return;
  }

  // 2) Fetch matches for this matchday within this save
  // 0–0 is a valid final result; no 'played' flag needed.
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      matchdayId,
      saveGameId,
      // If your schema allows nulls here, use gte: 0 to avoid TS null issues:
      homeGoals: { gte: 0 },
      awayGoals: { gte: 0 },
    },
    select: {
      homeGoals: true,
      awayGoals: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  if (matches.length === 0) return;

  // 3) Filter to D1–D4 teams only (avoid Distrital etc.)
  const allTeamIds = Array.from(
    new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))
  );

  // Only consider teams that (1) belong to this save and (2) are in allowed divisions
  const teamDivs = await prisma.saveGameTeam.findMany({
    where: { id: { in: allTeamIds }, saveGameId, division: { in: ALLOWED_DIVS } },
    select: { id: true },
  });
  const allowedTeamIds = new Set(teamDivs.map((t) => t.id));
  if (allowedTeamIds.size === 0) return;

  // 4) Build all upserts and run them in a single transaction for consistency
  const ops: Prisma.PrismaPromise<any>[] = [];

  for (const { homeGoals = 0, awayGoals = 0, homeTeamId, awayTeamId } of matches) {
    const homeAllowed = allowedTeamIds.has(homeTeamId);
    const awayAllowed = allowedTeamIds.has(awayTeamId);
    if (!homeAllowed && !awayAllowed) continue;

    const homeResult = getResult(homeGoals, awayGoals);
    const awayResult = getResult(awayGoals, homeGoals);

    if (homeAllowed) {
      ops.push(
        prisma.leagueTable.upsert({
          where: { teamId: homeTeamId },
          update: {
            played: { increment: 1 },
            wins: { increment: homeResult === 'win' ? 1 : 0 },
            draws: { increment: homeResult === 'draw' ? 1 : 0 },
            losses: { increment: homeResult === 'loss' ? 1 : 0 },
            points: { increment: pointsFor(homeResult) },
            goalsFor: { increment: homeGoals },
            goalsAgainst: { increment: awayGoals },
          },
          create: {
            teamId: homeTeamId,
            played: 1,
            wins: homeResult === 'win' ? 1 : 0,
            draws: homeResult === 'draw' ? 1 : 0,
            losses: homeResult === 'loss' ? 1 : 0,
            points: pointsFor(homeResult),
            goalsFor: homeGoals,
            goalsAgainst: awayGoals,
          },
        })
      );
    }

    if (awayAllowed) {
      ops.push(
        prisma.leagueTable.upsert({
          where: { teamId: awayTeamId },
          update: {
            played: { increment: 1 },
            wins: { increment: awayResult === 'win' ? 1 : 0 },
            draws: { increment: awayResult === 'draw' ? 1 : 0 },
            losses: { increment: awayResult === 'loss' ? 1 : 0 },
            points: { increment: pointsFor(awayResult) },
            goalsFor: { increment: awayGoals },
            goalsAgainst: { increment: homeGoals },
          },
          create: {
            teamId: awayTeamId,
            played: 1,
            wins: awayResult === 'win' ? 1 : 0,
            draws: awayResult === 'draw' ? 1 : 0,
            losses: awayResult === 'loss' ? 1 : 0,
            points: pointsFor(awayResult),
            goalsFor: awayGoals,
            goalsAgainst: homeGoals,
          },
        })
      );
    }
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }
}

/** Determines 'win' | 'draw' | 'loss' based on goals for/against. */
function getResult(goalsFor: number, goalsAgainst: number): Result {
  if (goalsFor > goalsAgainst) return 'win';
  if (goalsFor < goalsAgainst) return 'loss';
  return 'draw';
}

function pointsFor(result: Result): number {
  return result === 'win' ? 3 : result === 'draw' ? 1 : 0;
}

/* ---------------- Season reset helpers (call at season start) ---------------- */

/**
 * Deletes all LeagueTable rows for teams in D1–D4 for this save.
 * Use this at the start of a new season (before any league match is played).
 */
export async function resetLeagueTableForSave(saveGameId: number): Promise<void> {
  const teamIds = await prisma.saveGameTeam.findMany({
    where: { saveGameId, division: { in: ALLOWED_DIVS } },
    select: { id: true },
  });
  const ids = teamIds.map((t) => t.id);
  if (ids.length === 0) return;

  await prisma.leagueTable.deleteMany({
    where: { teamId: { in: ids } },
  });
}

/**
 * Ensures LeagueTable has zeroed entries for all D1–D4 teams of this save.
 * Safe to call after `resetLeagueTableForSave`. Skips duplicates.
 */
export async function initializeLeagueTableForSave(saveGameId: number): Promise<void> {
  const teamIds = await prisma.saveGameTeam.findMany({
    where: { saveGameId, division: { in: ALLOWED_DIVS } },
    select: { id: true },
  });
  const rows = teamIds.map((t) => ({ teamId: t.id }));
  if (rows.length === 0) return;

  await prisma.leagueTable.createMany({
    data: rows,
    skipDuplicates: true, // in case some rows already exist
  });
}

/**
 * Convenience: resets and initializes league table for a new season.
 * Call this from your season reset flow (e.g., when matchday rolls past 21→1).
 */
export async function prepareLeagueTableForNewSeason(saveGameId: number): Promise<void> {
  await resetLeagueTableForSave(saveGameId);
  await initializeLeagueTableForSave(saveGameId);
}
