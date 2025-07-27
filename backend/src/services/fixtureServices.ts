// src/services/fixtureServices.ts
import prisma from "../utils/prisma";
import { DivisionTier, MatchdayType } from "@prisma/client";

/* ------------------------------------------------------------------ LEAGUE */

export async function generateLeagueFixtures(saveGameId: number): Promise<void> {
  /* 1. collect team ids per division */
  const teamsByDivision: Record<DivisionTier, number[]> = {
    D1: [],
    D2: [],
    D3: [],
    D4: [],
    DIST: [],                          // 👈 new key, stays empty
  };

  for (const div of Object.keys(teamsByDivision) as DivisionTier[]) {
    if (div === "DIST") continue;      // no league for district teams
    const rows = await prisma.saveGameTeam.findMany({
      where: { saveGameId, division: div },
      orderBy: { localIndex: "asc" },
      select: { id: true },
    });
    teamsByDivision[div] = rows.map((t) => t.id);
  }

  /* 2. build fixtures only for visible divisions */
  const fixturesByDivision: Record<DivisionTier, number[][][]> = {
    D1: createDoubleRoundRobinFixtures(teamsByDivision.D1),
    D2: createDoubleRoundRobinFixtures(teamsByDivision.D2),
    D3: createDoubleRoundRobinFixtures(teamsByDivision.D3),
    D4: createDoubleRoundRobinFixtures(teamsByDivision.D4),
    DIST: [],                         // 👈 stays empty
  };
  const totalRounds = fixturesByDivision.D1.length; // 14

  /* 3. persist matchdays + matches */
  for (let r = 0; r < totalRounds; r++) {
    const md = await prisma.matchday.create({
  data: {
    number: r + 1,
    type: MatchdayType.LEAGUE,
    date: new Date(),
    saveGameId: saveGameId,
  },
});


    for (const div of ["D1", "D2", "D3", "D4"] as DivisionTier[]) {
      for (const [homeId, awayId] of fixturesByDivision[div][r]) {
        await prisma.saveGameMatch.create({
  data: {
    saveGameId,
    homeTeamId: homeId,
    awayTeamId: awayId,
    matchDate: new Date(),
    matchdayId: md.id,
    matchdayType: MatchdayType.LEAGUE, // ← explicitly required
  },
});
      }
    }
  }
}

/* ------------------------------------------------------------------ CUP */

export async function generateCupFixtures(saveGameId: number): Promise<void> {
  /* gather every team, including DIST */
  let remaining = (
    await prisma.saveGameTeam.findMany({
      where: { saveGameId },
      select: { id: true },
    })
  ).map((t) => t.id);

  const CUP_ROUNDS = [
    "Round of 128",
    "Round of 64",
    "Round of 32",
    "Round of 16",
    "Quarterfinal",
    "Semifinal",
    "Final",
  ];

  for (let i = 0; i < CUP_ROUNDS.length; i++) {
    remaining = shuffleArray(remaining);
    const md = await prisma.matchday.create({
  data: {
    number: 14 + i + 1,
    type: MatchdayType.CUP,
    date: new Date(),
    saveGameId: saveGameId,
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
          matchdayId: md.id,
          matchdayType: MatchdayType.CUP,
        },
      });

      winners.push(Math.random() < 0.5 ? homeId : awayId);
    }
    remaining = winners;
  }
}

/* ---------------------------------------------------------------- helpers */

function createDoubleRoundRobinFixtures(ids: number[]): number[][][] {
  const first = createRoundRobinFixtures(ids);
  const second = first.map((r) => r.map(([h, a]) => [a, h]));
  return [...first, ...second];
}

function createRoundRobinFixtures(ids: number[]): number[][][] {
  const teams = [...ids];
  if (teams.length % 2 !== 0) teams.push(-1);
  const rounds = teams.length - 1;
  const half = teams.length / 2;
  const sched: number[][][] = [];

  for (let r = 0; r < rounds; r++) {
    const matches: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      if (home !== -1 && away !== -1) matches.push([home, away]);
    }
    sched.push(matches);
    teams.splice(1, 0, teams.pop()!);
  }
  return sched;
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
