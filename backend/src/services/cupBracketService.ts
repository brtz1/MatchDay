// backend/src/services/cupBracketService.ts

import prisma from "../utils/prisma";
import { DivisionTier, MatchdayType, Prisma } from "@prisma/client";
import { broadcastCupRoundCreated } from "../sockets/broadcast";

/* ------------------------------------------------------------------------------------------------
 * Round labels (index 0 => Round of 128)
 * ------------------------------------------------------------------------------------------------ */
export const CUP_ROUNDS = [
  "Round of 128",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Final",
] as const;

export type CupRoundLabel = (typeof CUP_ROUNDS)[number];

/**
 * ✅ Cup rounds placed on the global season calendar.
 *    Align this with your League-only days so they never clash.
 *    Index-aligned with CUP_ROUNDS above.
 *
 *    0 → R128 → #3
 *    1 → R64  → #6
 *    2 → R32  → #9   (← moved from 8 → 9 to keep Matchday 8 as LEAGUE)
 *    3 → R16  → #12
 *    4 → QF   → #15
 *    5 → SF   → #18
 *    6 → Final→ #21
 */
const CUP_CALENDAR_NUMBERS: number[] = [3, 6, 9, 12, 15, 18, 21];

function nextRoundLabel(current: CupRoundLabel): CupRoundLabel | null {
  const i = CUP_ROUNDS.indexOf(current);
  return i >= 0 && i < CUP_ROUNDS.length - 1 ? CUP_ROUNDS[i + 1] : null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function labelFromMatchCount(matchCount: number): CupRoundLabel {
  switch (matchCount) {
    case 64:
      return "Round of 128";
    case 32:
      return "Round of 64";
    case 16:
      return "Round of 32";
    case 8:
      return "Round of 16";
    case 4:
      return "Quarterfinal";
    case 2:
      return "Semifinal";
    case 1:
      return "Final";
    default:
      return "Round of 128";
  }
}

/* ------------------------------------------------------------------------------------------------
 * Internal helpers
 * ------------------------------------------------------------------------------------------------ */

/**
 * Create (or reuse) a CUP matchday at a given global number for a given round.
 * - If a CUP matchday already exists for that number, it is reused (label is updated if missing).
 * - If a LEAGUE matchday occupies that number, we try later cup numbers in the
 *   configured calendar (e.g., use #9 instead of #8) to avoid the (saveGameId, number) unique conflict.
 */
async function createOrReuseCupMatchday(
  saveGameId: number,
  desiredNumber: number,
  roundLabel: CupRoundLabel
): Promise<{ id: number; number: number }> {
  // If there is already a CUP md for this save/round, prefer it
  const existingByRound = await prisma.matchday.findFirst({
    where: { saveGameId, type: MatchdayType.CUP, roundLabel },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });
  if (existingByRound) return existingByRound;

  // Try desiredNumber first, then any later mapped cup number
  const candidates = [
    desiredNumber,
    ...CUP_CALENDAR_NUMBERS.filter((n) => n > desiredNumber),
  ];

  for (const num of candidates) {
    const atNum = await prisma.matchday.findFirst({
      where: { saveGameId, number: num },
      select: { id: true, type: true, roundLabel: true },
    });

    if (!atNum) {
      // free slot → create CUP day
      const created = await prisma.matchday.create({
        data: {
          saveGameId,
          number: num,
          type: MatchdayType.CUP,
          roundLabel,
          isPlayed: false,
        },
        select: { id: true, number: true },
      });
      return created;
    }

    if (atNum.type === MatchdayType.CUP) {
      // reuse existing CUP day at this number; update label if needed
      if (atNum.roundLabel !== roundLabel) {
        await prisma.matchday.update({
          where: { id: atNum.id },
          data: { roundLabel },
        });
      }
      return { id: atNum.id, number: num };
    }

    // atNum is a LEAGUE day → try the next candidate
  }

  throw new Error(
    `[Cup] No available calendar slot for ${roundLabel}. Tried: ${candidates.join(", ")}`
  );
}

/**
 * Idempotently create matches for a matchday. If matches already exist for this matchday,
 * we reuse them (no duplicates).
 */
async function ensureMatchesForMatchday(
  saveGameId: number,
  matchdayId: number,
  pairs: Array<[number, number]>
) {
  const existing = await prisma.saveGameMatch.findMany({
    where: { saveGameId, matchdayId },
    select: { id: true },
  });

  if (existing.length > 0) return; // already seeded

  for (const [homeTeamId, awayTeamId] of pairs) {
    await prisma.saveGameMatch.create({
      data: {
        saveGameId,
        matchdayId,
        homeTeamId,
        awayTeamId,
        isPlayed: false,
      },
    });
  }
}

/* ------------------------------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------------------------------ */

/**
 * Create Round of 128 with bracketed, persistent ordering:
 * - 8 teams per Division D1–D4 (total 32) + 96 teams from DIST → 128 teams
 * - First round: Division team vs DIST team where possible
 * - Save order of created matches as the bracket sequence (pair 1 winner vs pair 2 winner, etc.)
 */
export async function generateInitialCupBracket(saveGameId: number) {
  // If any CUP matchday already exists, no-op (we assume bracket already seeded)
  const exists = await prisma.matchday.findFirst({
    where: { saveGameId, type: MatchdayType.CUP },
    select: { id: true },
  });
  if (exists) return;

  // Fetch teams: 32 division (D1..D4), rest from DIST
  const [divTeams, distAll] = await Promise.all([
    prisma.saveGameTeam.findMany({
      where: {
        saveGameId,
        division: { in: [DivisionTier.D1, DivisionTier.D2, DivisionTier.D3, DivisionTier.D4] },
      },
      select: { id: true, division: true },
      orderBy: { id: "asc" },
    }),
    prisma.saveGameTeam.findMany({
      where: { saveGameId, division: DivisionTier.DIST },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const TOTAL = 128;
  const needDist = TOTAL - divTeams.length;
  if (needDist > distAll.length) {
    console.warn(
      `[Cup] Not enough DIST teams to form Round of 128. Needed ${needDist}, have ${distAll.length}.`
    );
  }
  const distPool = shuffle(distAll).slice(0, Math.max(0, needDist));

  // Pairing for Round of 128:
  const divShuffled = shuffle(divTeams);
  const distShuffled = shuffle(distPool);

  // D vs DIST pairs (ideally 32)
  const firstBucket = Math.min(divShuffled.length, distShuffled.length);
  const dVsDist: Array<[number, number]> = [];
  for (let i = 0; i < firstBucket; i++) {
    dVsDist.push([divShuffled[i].id, distShuffled[i].id]);
  }

  // Remaining DIST vs DIST
  const remainingDist = distShuffled.slice(firstBucket);
  const distVsDist: Array<[number, number]> = [];
  for (let i = 0; i + 1 < remainingDist.length; i += 2) {
    distVsDist.push([remainingDist[i].id, remainingDist[i + 1].id]);
  }

  // Leftovers (odd counts / unexpected deficits)
  const leftovers: number[] = [];
  if (remainingDist.length % 2 === 1)
    leftovers.push(remainingDist[remainingDist.length - 1].id);
  const remainingDivIds = divShuffled.slice(firstBucket).map((t) => t.id);
  leftovers.push(...remainingDivIds);
  const tailPairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < leftovers.length; i += 2) {
    tailPairs.push([leftovers[i], leftovers[i + 1]]);
  }

  const pairs = shuffle(dVsDist).concat(shuffle(distVsDist)).concat(shuffle(tailPairs));
  if (pairs.length !== 64) {
    console.warn(`[Cup] Round of 128 pairs produced ${pairs.length} matches; expected 64.`);
  }

  // Use the calendar number for Round of 128 (index 0) → #3
  const desiredNumber = CUP_CALENDAR_NUMBERS[0];
  const md = await createOrReuseCupMatchday(saveGameId, desiredNumber, "Round of 128");

  await ensureMatchesForMatchday(saveGameId, md.id, pairs);

  // Notify FE that Round of 128 exists
  try {
    broadcastCupRoundCreated(
      saveGameId,
      {
        roundLabel: "Round of 128",
        matchdayNumber: md.number,
        matchdayId: md.id,
        matches: pairs.length,
      },
      { alsoGlobal: true }
    );
  } catch {
    /* sockets may not be initialized; ignore */
  }
}

/**
 * Create next round by **static bracket** pairing: winner of match 1 vs winner of match 2, etc.
 * Assumes fromRound is fully played (including tie-breaks).
 */
export async function advanceCupRound(saveGameId: number, fromRound: CupRoundLabel) {
  const toRound = nextRoundLabel(fromRound);
  if (!toRound) return;

  const fromMd = await prisma.matchday.findFirst({
    where: { saveGameId, type: MatchdayType.CUP, roundLabel: fromRound },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!fromMd) throw new Error(`[Cup] advanceCupRound: no matchday for ${fromRound}`);

  const matches = await prisma.saveGameMatch.findMany({
    where: { saveGameId, matchdayId: fromMd.id },
    orderBy: { id: "asc" }, // preserve bracket order
    select: {
      id: true,
      isPlayed: true,
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  // Validate all played and winners determinable
  for (const m of matches) {
    if (!m.isPlayed) {
      throw new Error(`[Cup] Cannot advance: unplayed match id=${m.id} in ${fromRound}`);
    }
    if (m.homeGoals === m.awayGoals) {
      throw new Error(`[Cup] Cannot advance: unresolved draw id=${m.id}`);
    }
  }

  const winners: number[] = matches.map((m) =>
    (m.homeGoals ?? 0) > (m.awayGoals ?? 0) ? m.homeTeamId : m.awayTeamId
  );

  const nextPairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < winners.length; i += 2) {
    nextPairs.push([winners[i], winners[i + 1]]);
  }

  // Use calendar number based on the index of the *toRound*
  const toIndex = CUP_ROUNDS.indexOf(toRound);
  if (toIndex < 0 || toIndex >= CUP_CALENDAR_NUMBERS.length) {
    throw new Error(`[Cup] Invalid round index for ${toRound}`);
  }
  const desiredNumber = CUP_CALENDAR_NUMBERS[toIndex];

  const nextMd = await createOrReuseCupMatchday(saveGameId, desiredNumber, toRound);

  await ensureMatchesForMatchday(saveGameId, nextMd.id, nextPairs);

  // Notify FE that the next round exists
  try {
    broadcastCupRoundCreated(
      saveGameId,
      {
        roundLabel: toRound,
        matchdayNumber: nextMd.number,
        matchdayId: nextMd.id,
        matches: nextPairs.length,
      },
      { alsoGlobal: true }
    );
  } catch {
    /* sockets may not be initialized; ignore */
  }
}

/** If a CUP round is fully played, seed the next round (idempotent). */
export async function maybeAdvanceCupAfterRound(
  saveGameId: number,
  round: CupRoundLabel
) {
  const md = await prisma.matchday.findFirst({
    where: { saveGameId, type: MatchdayType.CUP, roundLabel: round },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!md) return;

  const rows = await prisma.saveGameMatch.findMany({
    where: { saveGameId, matchdayId: md.id },
    select: { id: true, isPlayed: true },
  });

  if (rows.length > 0 && rows.every((r) => r.isPlayed)) {
    await advanceCupRound(saveGameId, round);
  }
}

/** Cup Log for FE `/api/cup/log` (renders only existing rounds; no future pre-seeding). */
export async function getCupLog(saveGameId: number) {
  const matchdays = await prisma.matchday.findMany({
    where: { saveGameId, type: MatchdayType.CUP },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      roundLabel: true,
      saveGameMatches: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          homeTeamId: true,
          awayTeamId: true,
          homeGoals: true,
          awayGoals: true,
          isPlayed: true,
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
      },
    },
  });

  return matchdays.map((md) => {
    const label = (md.roundLabel as CupRoundLabel) ?? labelFromMatchCount(md.saveGameMatches.length);
    return {
      matchdayNumber: md.number,
      roundLabel: label,
      matches: md.saveGameMatches.map((m) => ({
        id: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeTeam: { name: m.homeTeam?.name ?? "—", goals: (m.homeGoals as number | null) ?? null },
        awayTeam: { name: m.awayTeam?.name ?? "—", goals: (m.awayGoals as number | null) ?? null },
        played: m.isPlayed,
      })),
    };
  });
}
