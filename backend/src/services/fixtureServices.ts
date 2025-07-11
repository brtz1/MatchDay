// src/services/fixtureService.ts

import prisma from '../utils/prisma';
import { DivisionTier, MatchdayType } from '@prisma/client';

/**
 * Generate all league fixtures (double round-robin) for a given save game.
 * Creates 14 MATCHDAY records of type LEAGUE, and for each, schedules
 * every division's matches on that matchday.
 *
 * @param saveGameId - the ID of the SaveGame to generate fixtures for
 */
export async function generateLeagueFixtures(saveGameId: number): Promise<void> {
  // 1. Load teams by division, ordered by localIndex
  const teamsByDivision: Record<DivisionTier, number[]> = {
    D1: [],
    D2: [],
    D3: [],
    D4: [],
  };
  for (const div of Object.keys(teamsByDivision) as DivisionTier[]) {
    const teams = await prisma.saveGameTeam.findMany({
      where: { saveGameId, division: div },
      orderBy: { localIndex: 'asc' },
      select: { id: true },
    });
    teamsByDivision[div] = teams.map((t) => t.id);
  }

  // 2. Build round schedules per division
  const fixturesByDivision: Record<DivisionTier, number[][][]> = {
    D1: createDoubleRoundRobinFixtures(teamsByDivision.D1),
    D2: createDoubleRoundRobinFixtures(teamsByDivision.D2),
    D3: createDoubleRoundRobinFixtures(teamsByDivision.D3),
    D4: createDoubleRoundRobinFixtures(teamsByDivision.D4),
  };
  const totalRounds = fixturesByDivision.D1.length; // should be 14

  // 3. Create one matchday per round, and schedule all division matches
  for (let round = 0; round < totalRounds; round++) {
    const matchday = await prisma.matchday.create({
      data: {
        number: round + 1,
        type: MatchdayType.LEAGUE,
        date: new Date(),
      },
    });

    for (const div of Object.keys(fixturesByDivision) as DivisionTier[]) {
      const roundMatches = fixturesByDivision[div][round];
      for (const [homeId, awayId] of roundMatches) {
        await prisma.saveGameMatch.create({
          data: {
            saveGameId,
            homeTeamId: homeId,
            awayTeamId: awayId,
            matchDate: new Date(),
            matchdayId: matchday.id,
          },
        });
      }
    }
  }
}

/**
 * Generate all cup fixtures (knockout rounds) for a given save game.
 * Creates 7 MATCHDAY records of type CUP, pairing and advancing teams each round.
 *
 * @param saveGameId - the ID of the SaveGame to generate cup fixtures for
 */
export async function generateCupFixtures(saveGameId: number): Promise<void> {
  // 1. Gather all teams in this save
  let remaining = (await prisma.saveGameTeam.findMany({
    where: { saveGameId },
    select: { id: true },
  })).map((t) => t.id);

  const CUP_ROUND_NAMES = [
    'Round of 128',
    'Round of 64',
    'Round of 32',
    'Round of 16',
    'Quarterfinal',
    'Semifinal',
    'Final',
  ];

  // 2. For each cup round, shuffle and pair
  for (let i = 0; i < CUP_ROUND_NAMES.length; i++) {
    // Shuffle team IDs
    remaining = shuffleArray(remaining);

    // Create the matchday record
    const matchday = await prisma.matchday.create({
      data: {
        number: 14 + i + 1, // rounds 15–21
        type: MatchdayType.CUP,
        date: new Date(),
      },
    });

    const winners: number[] = [];
    // Pair off and create matches
    for (let j = 0; j < remaining.length; j += 2) {
      const homeId = remaining[j];
      const awayId = remaining[j + 1];
      if (awayId === undefined) break; // odd bye case

      // Persist the match
      await prisma.saveGameMatch.create({
        data: {
          saveGameId,
          homeTeamId: homeId,
          awayTeamId: awayId,
          matchDate: new Date(),
          matchdayId: matchday.id,
        },
      });

      // Randomly decide winner
      winners.push(Math.random() < 0.5 ? homeId : awayId);
    }

    remaining = winners;
  }
}

/**
 * Create a double round-robin schedule:
 * each team plays every other home and away.
 *
 * @param teamIds - list of team IDs
 * @returns an array of rounds, each a list of [home, away] pairs
 */
function createDoubleRoundRobinFixtures(teamIds: number[]): number[][][] {
  const firstLeg = createRoundRobinFixtures(teamIds);
  const secondLeg = firstLeg.map((round) =>
    round.map(([home, away]) => [away, home] as [number, number])
  );
  return [...firstLeg, ...secondLeg];
}

/**
 * Create a single round-robin schedule:
 *
 * @param teamIds - list of team IDs
 * @returns an array of rounds, each a list of [home, away] pairs
 */
function createRoundRobinFixtures(teamIds: number[]): number[][][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(-1); // bye if odd

  const totalRounds = teams.length - 1;
  const half = teams.length / 2;
  const schedule: number[][][] = [];

  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      if (home !== -1 && away !== -1) {
        roundMatches.push([home, away]);
      }
    }
    schedule.push(roundMatches);
    // Rotate (except first team)
    teams.splice(1, 0, teams.pop()!);
  }

  return schedule;
}

/**
 * In-place Fisher–Yates shuffle.
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
