import prisma from "../utils/prisma";
import { DivisionTier, MatchdayType } from "@prisma/client";
import { generateInitialCupBracket } from "./cupBracketService";

/* ───────────────────────────── Constants ───────────────────────────── */

const LEAGUE_ROUNDS = 14;

// Exact calendar you requested
const LEAGUE_MATCHDAY_NUMBERS: number[] = [
  1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20,
];

const CUP_SLOTS: Array<{ number: number; label: string }> = [
  { number: 3, label: "Round of 128" },
  { number: 6, label: "Round of 64" },
  { number: 9, label: "Round of 32" },
  { number: 12, label: "Round of 16" },
  { number: 15, label: "Quarterfinal" },
  { number: 18, label: "Semifinal" },
  { number: 21, label: "Final" },
];

/* ───────────────────────────── Entrypoint ───────────────────────────── */

export async function generateFullSeason(
  saveGameId: number,
  teams: { id: number }[]
): Promise<void> {
  // Ensure league table rows exist
  for (const { id: teamId } of teams) {
    await prisma.leagueTable.upsert({
      where: { teamId },
      update: {},
      create: { teamId },
    });
  }

  // Pre-create ALL 21 matchdays with correct types (no real dates)
  await upsertAllMatchdaysSkeleton(saveGameId);

  // Create all LEAGUE fixtures attached to their mandated matchdays
  await generateLeagueFixtures(saveGameId);

  // Seed Cup Round of 128 (static bracket/matches; attaches to the CUP matchday we already created)
  await generateInitialCupBracket(saveGameId);

  // Ensure CUP matchdays have the correct labels (and type)
  await labelCupMatchdays(saveGameId);
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

  // Gather team IDs per division (skip DIST for league)
  for (const div of ["D1", "D2", "D3", "D4"] as DivisionTier[]) {
    const rows = await prisma.saveGameTeam.findMany({
      where: { saveGameId, division: div },
      orderBy: { localIndex: "asc" },
      select: { id: true },
    });
    teamsByDivision[div] = rows.map((t) => t.id);
    console.log(`📌 Division ${div} has ${rows.length} teams`);
  }

  // Create double round robin fixtures (14 rounds) for each division
  const fixturesByDivision: Record<DivisionTier, number[][][]> = {
    D1: createDoubleRoundRobinFixtures(teamsByDivision.D1),
    D2: createDoubleRoundRobinFixtures(teamsByDivision.D2),
    D3: createDoubleRoundRobinFixtures(teamsByDivision.D3),
    D4: createDoubleRoundRobinFixtures(teamsByDivision.D4),
    DIST: [],
  };

  // Attach each league round to the mandated matchday number
  for (let roundIdx = 0; roundIdx < LEAGUE_ROUNDS; roundIdx++) {
    const mdNumber = LEAGUE_MATCHDAY_NUMBERS[roundIdx];

    // exists because we pre-created all matchdays
    const matchday = await prisma.matchday.findFirstOrThrow({
      where: { saveGameId, number: mdNumber, type: MatchdayType.LEAGUE },
      select: { id: true },
    });

    for (const div of ["D1", "D2", "D3", "D4"] as DivisionTier[]) {
      const roundFixtures = fixturesByDivision[div][roundIdx];
      if (!roundFixtures || roundFixtures.length === 0) {
        console.warn(`⚠️ No fixtures for division ${div} in league round index ${roundIdx} (md ${mdNumber})`);
        continue;
      }

      for (const [homeId, awayId] of roundFixtures) {
        await prisma.saveGameMatch.create({
          data: {
            saveGame: { connect: { id: saveGameId } },
            matchday: { connect: { id: matchday.id } },
            homeTeam: { connect: { id: homeId } },
            awayTeam: { connect: { id: awayId } },
          },
        });
      }
    }
  }
}

/* ──────────────────────── Cup utilities (no dates) ─────────────────────── */

async function upsertAllMatchdaysSkeleton(saveGameId: number): Promise<void> {
  // Create or fix all 21 matchdays, assigning type by the requested sequence.
  const leagueSet = new Set(LEAGUE_MATCHDAY_NUMBERS);
  const cupNumbers = CUP_SLOTS.map((s) => s.number);
  const cupSet = new Set(cupNumbers);

  for (let n = 1; n <= 21; n++) {
    const type = leagueSet.has(n) ? MatchdayType.LEAGUE : MatchdayType.CUP;
    const exists = await prisma.matchday.findFirst({
      where: { saveGameId, number: n },
      select: { id: true, type: true },
    });

    if (!exists) {
      await prisma.matchday.create({
        data: {
          saveGame: { connect: { id: saveGameId } },
          number: n,
          type,
        },
      });
    } else if (exists.type !== type) {
      await prisma.matchday.update({
        where: { id: exists.id },
        data: { type },
      });
    }
  }
}

async function labelCupMatchdays(saveGameId: number): Promise<void> {
  // Ensure the seven CUP matchdays have the expected labels in the expected slots.
  for (const slot of CUP_SLOTS) {
    const md = await prisma.matchday.findFirst({
      where: { saveGameId, number: slot.number },
      select: { id: true, type: true },
    });
    if (!md) continue;
    if (md.type !== MatchdayType.CUP) {
      await prisma.matchday.update({ where: { id: md.id }, data: { type: MatchdayType.CUP } });
    }
    await prisma.matchday.update({
      where: { id: md.id },
      data: { roundLabel: slot.label },
    });
  }
}

/* ───────────────────────── Deprecated (kept for compat) ──────────────────── */

export async function generateCupFixtures(saveGameId: number): Promise<void> {
  console.warn(
    "[fixtureServices] generateCupFixtures is deprecated. Seeding Round of 128 via generateInitialCupBracket()."
  );
  await generateInitialCupBracket(saveGameId);
  await labelCupMatchdays(saveGameId);
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function createDoubleRoundRobinFixtures(ids: number[]): number[][][] {
  const first = createRoundRobinFixtures(ids);
  const second = first.map((round) => round.map(([h, a]) => [a, h]));
  return [...first, ...second];
}

function createRoundRobinFixtures(ids: number[]): number[][][] {
  const teams = [...ids];
  if (teams.length % 2 !== 0) teams.push(-1); // BYE placeholder

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
    teams.splice(1, 0, teams.pop()!); // rotate all but the first
  }

  return schedule;
}
