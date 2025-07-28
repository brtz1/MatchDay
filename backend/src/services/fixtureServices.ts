import prisma from "../utils/prisma";
import { DivisionTier, MatchdayType } from "@prisma/client";

/* ───────────────────────────── Constants ───────────────────────────── */

const LEAGUE_ROUNDS = 14;
const CUP_ROUNDS = [
  "Round of 128",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Final",
];

/* ───────────────────────────── Entrypoint ───────────────────────────── */

export async function generateFullSeason(saveGameId: number, teams: { id: number }[]): Promise<void> {
  for (const { id: teamId } of teams) {
    await prisma.leagueTable.upsert({
      where: { teamId },
      update: {},
      create: { teamId },
    });
  }

  await generateLeagueFixtures(saveGameId);

  if (teams.length >= 16) {
    await generateCupFixtures(saveGameId);
  } else {
    console.warn(`⚠️ Skipping cup generation: only ${teams.length} teams found`);
  }
}


/* ───────────────────────────── League Fixtures ───────────────────────────── */

export async function generateLeagueFixtures(saveGameId: number): Promise<void> {
  const teamsByDivision: Record<DivisionTier, number[]> = {
    D1: [],
    D2: [],
    D3: [],
    D4: [],
    DIST: [],
  };

  // Gather team IDs per division
  for (const div of Object.keys(teamsByDivision) as DivisionTier[]) {
    if (div === "DIST") continue; // skip DIST
    const teams = await prisma.saveGameTeam.findMany({
      where: { saveGameId, division: div },
      orderBy: { localIndex: "asc" },
      select: { id: true },
    });
    teamsByDivision[div] = teams.map((t) => t.id);
    console.log(`📌 Division ${div} has ${teams.length} teams`);
  }

  // Create double round robin fixtures
  const fixturesByDivision: Record<DivisionTier, number[][][]> = {
    D1: createDoubleRoundRobinFixtures(teamsByDivision.D1),
    D2: createDoubleRoundRobinFixtures(teamsByDivision.D2),
    D3: createDoubleRoundRobinFixtures(teamsByDivision.D3),
    D4: createDoubleRoundRobinFixtures(teamsByDivision.D4),
    DIST: [],
  };

  // Create matchday and matches
  for (let round = 0; round < LEAGUE_ROUNDS; round++) {
    const matchday = await prisma.matchday.create({
      data: {
        number: round + 1,
        type: MatchdayType.LEAGUE,
        date: new Date(),
        saveGameId,
      },
    });

    for (const div of ["D1", "D2", "D3", "D4"] as DivisionTier[]) {
      const roundFixtures = fixturesByDivision[div][round];

      if (!roundFixtures || roundFixtures.length === 0) {
        console.warn(`⚠️ No fixtures for division ${div} in round ${round + 1}`);
        continue;
      }

      for (const [homeId, awayId] of roundFixtures) {
        await prisma.saveGameMatch.create({
          data: {
            saveGameId,
            homeTeamId: homeId,
            awayTeamId: awayId,
            matchDate: new Date(),
            matchdayId: matchday.id,
            matchdayType: MatchdayType.LEAGUE,
          },
        });

        console.log(`✅ Match created: ${homeId} vs ${awayId} [${div}, Round ${round + 1}]`);
      }
    }
  }
}


/* ───────────────────────────── Cup Fixtures ───────────────────────────── */

export async function generateCupFixtures(saveGameId: number): Promise<void> {
  let teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId },
    select: { id: true },
  });

  let remaining = teams.map((t) => t.id);
  if (remaining.length < 16) {
    console.warn(`⚠️ Skipping cup: too few teams (${remaining.length})`);
    return;
  }

  for (let i = 0; i < CUP_ROUNDS.length; i++) {
    remaining = shuffleArray(remaining);

    const matchday = await prisma.matchday.create({
      data: {
        number: LEAGUE_ROUNDS + i + 1,
        type: MatchdayType.CUP,
        date: new Date(),
        saveGameId,
      },
    });

    const winners: number[] = [];

    for (let j = 0; j < remaining.length; j += 2) {
      const homeId = remaining[j];
      const awayId = remaining[j + 1];
      if (awayId === undefined) break;

      await prisma.saveGameMatch.create({
        data: {
          saveGameId,
          homeTeamId: homeId,
          awayTeamId: awayId,
          matchDate: new Date(),
          matchdayId: matchday.id,
          matchdayType: MatchdayType.CUP,
        },
      });

      // Temporarily pick a winner to continue the tree
      winners.push(Math.random() < 0.5 ? homeId : awayId);
    }

    remaining = winners;
  }
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function createDoubleRoundRobinFixtures(ids: number[]): number[][][] {
  const first = createRoundRobinFixtures(ids);
  const second = first.map((round) => round.map(([h, a]) => [a, h]));
  return [...first, ...second];
}

function createRoundRobinFixtures(ids: number[]): number[][][] {
  const teams = [...ids];
  if (teams.length % 2 !== 0) teams.push(-1); // use -1 as BYE placeholder

  const rounds = teams.length - 1;
  const half = teams.length / 2;
  const schedule: number[][][] = [];

  for (let r = 0; r < rounds; r++) {
    const round: number[][] = [];

    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      if (home !== -1 && away !== -1) {
        round.push([home, away]);
      }
    }

    schedule.push(round);
    teams.splice(1, 0, teams.pop()!); // rotate teams except first
  }

  return schedule;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
