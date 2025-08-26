// backend/src/services/matchStateService.ts

import prisma from "../utils/prisma";
import type { MatchState as PrismaMatchState, MatchEventType } from "@prisma/client";
import { ensureAppearance } from "./saveStatsService";

/* ----------------------------------------------------------------------------
 * Public types (aligned with FE expectations)
 * ---------------------------------------------------------------------------- */
export type Side = "home" | "away";

export interface PublicPlayer {
  id: number;
  name: string;
  position: string | null;
  rating: number | null;
  isInjured: boolean; // lockedUntilNextMatchday OR injured this match (and still on field)
}

export interface PublicMatchState {
  lineup: PublicPlayer[];       // order = state order
  bench: PublicPlayer[];        // order = state order
  subsRemaining: number;
}

export interface TeamMatchInfoDTO {
  matchId: number;
  isHomeTeam: boolean;
}

/* ----------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------- */

function isGKPosition(pos: string | null | undefined): boolean {
  return (pos ?? "").toUpperCase() === "GK";
}

function removeIdOnce(arr: number[], id: number): void {
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1);
}

/**
 * Get the set of player ids that suffered an INJURY event in this match.
 * (We only *flag* them; we do NOT remove them from lineup.)
 */
async function getInjuredIdsForMatch(matchId: number): Promise<Set<number>> {
  const events = await prisma.matchEvent.findMany({
    where: {
      saveGameMatchId: matchId,
      type: "INJURY" as MatchEventType,
      NOT: { saveGamePlayerId: null },
    },
    select: { saveGamePlayerId: true },
  });
  const ids = new Set<number>();
  for (const ev of events) {
    if (typeof ev.saveGamePlayerId === "number") {
      ids.add(ev.saveGamePlayerId);
    }
  }
  return ids;
}

/**
 * Fetch players by ids keeping the given order.
 * When `injuredIds` is provided, we mark `isInjured` if the player id is in the set
 * (e.g., they were injured during this match). We also mark injured if they are locked.
 */
async function fetchPlayersByIdsPreserveOrder(
  ids: number[],
  opts?: { injuredIds?: Set<number> }
): Promise<PublicPlayer[]> {
  if (ids.length === 0) return [];
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      position: true,
      rating: true,
      lockedUntilNextMatchday: true,
    },
  });
  const inj = opts?.injuredIds ?? new Set<number>();
  const byId = new Map(players.map((p) => [p.id, p]));

  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({
      id: p!.id,
      name: p!.name,
      position: p!.position,
      rating: p!.rating,
      // "Injured" in UI if: locked OR recorded INJURY event for this match
      isInjured: Boolean(p!.lockedUntilNextMatchday) || inj.has(p!.id),
    }));
}

async function pickInitialXI(teamId: number): Promise<{ lineup: number[]; bench: number[] }> {
  const all = await prisma.saveGamePlayer.findMany({
    where: { teamId },
    orderBy: [{ position: "asc" }, { rating: "desc" }, { id: "asc" }],
    select: { id: true, position: true, rating: true, lockedUntilNextMatchday: true },
  });

  // Prefer 1 GK starter if available and not locked
  const gks = all.filter((p) => isGKPosition(p.position) && !p.lockedUntilNextMatchday);
  const field = all.filter((p) => !isGKPosition(p.position) && !p.lockedUntilNextMatchday);

  const lineup: number[] = [];
  const bench: number[] = [];

  if (gks.length > 0) {
    lineup.push(gks[0].id);
    // remaining GKs go to bench candidates
    for (let i = 1; i < gks.length; i++) bench.push(gks[i].id);
  }

  for (const p of field) {
    if (lineup.length < 11) lineup.push(p.id);
    else bench.push(p.id);
  }

  // If still < 11 and no healthy GK, allow 0-GK XI by topping up from any available (locked players excluded)
  if (lineup.length < 11) {
    const extras = all
      .filter((p) => !p.lockedUntilNextMatchday && !lineup.includes(p.id))
      .map((p) => p.id);
    for (const pid of extras) {
      if (lineup.length < 11) lineup.push(pid);
      else bench.push(pid);
    }
  }

  return { lineup, bench };
}

/**
 * Ensure a MatchState row exists for a SaveGameMatch.
 * - If missing, creates a default using best-available XI (1 GK if possible).
 */
export async function ensureMatchState(matchId: number): Promise<PrismaMatchState> {
  // Try existing
  const existing = await prisma.matchState.findUnique({
    where: { saveGameMatchId: matchId },
  });
  if (existing) return existing;

  // We need teams to build a fallback state
  const match = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) throw new Error("Match not found");

  const [home, away] = await Promise.all([
    pickInitialXI(match.homeTeamId),
    pickInitialXI(match.awayTeamId),
  ]);

  const created = await prisma.matchState.create({
    data: {
      saveGameMatchId: matchId,
      homeFormation: "4-4-2",
      awayFormation: "4-4-2",
      homeLineup: home.lineup,
      homeReserves: home.bench,
      awayLineup: away.lineup,
      awayReserves: away.bench,
      homeSubsMade: 0,
      awaySubsMade: 0,
      subsRemainingHome: 3,
      subsRemainingAway: 3,
      isPaused: false,
    },
  });

  // Create appearance rows for initial XI (idempotent in ensureAppearance)
  await Promise.all([
    ...home.lineup.map((pid) => ensureAppearance(pid, matchId)),
    ...away.lineup.map((pid) => ensureAppearance(pid, matchId)),
  ]);

  return created;
}

/**
 * Return FE-shaped state for a given side.
 * - Injured players remain on the field; we only flag them.
 */
export async function getPublicMatchState(matchId: number, side: Side): Promise<PublicMatchState> {
  const ms = await ensureMatchState(matchId);
  const isHome = side === "home";

  const lineupIds = isHome ? ms.homeLineup ?? [] : ms.awayLineup ?? [];
  const benchIds  = isHome ? ms.homeReserves ?? [] : ms.awayReserves ?? [];
  const subsRemaining = isHome ? ms.subsRemainingHome ?? 0 : ms.subsRemainingAway ?? 0;

  // Who got injured this match?
  const injuredThisMatch = await getInjuredIdsForMatch(matchId);

  // Mark injuries for both lists (especially needed for the on-field list)
  const [lineup, bench] = await Promise.all([
    fetchPlayersByIdsPreserveOrder(lineupIds, { injuredIds: injuredThisMatch }),
    fetchPlayersByIdsPreserveOrder(benchIds,  { injuredIds: injuredThisMatch }),
  ]);

  return { lineup, bench, subsRemaining };
}

/**
 * Enforce GK uniqueness AFTER a hypothetical swap (out -> in).
 * Throws an Error if the resulting lineup would have >1 GK.
 */
async function assertSingleGKAfterSwap(lineupIds: number[], outId: number, inId: number) {
  const nextIds = lineupIds.filter((id) => id !== outId).concat(inId);
  if (nextIds.length === 0) return;

  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: nextIds } },
    select: { id: true, position: true },
  });
  const gkCount = players.reduce((acc, p) => acc + (isGKPosition(p.position) ? 1 : 0), 0);
  if (gkCount > 1) {
    const err = new Error("GK_ALREADY_PRESENT");
    (err as any).code = "GK_ALREADY_PRESENT";
    throw err;
  }
}

/**
 * Validate that inId is eligible (on bench, not locked) and outId is currently on-field.
 */
async function validateSubEligibility(
  matchId: number,
  isHomeTeam: boolean,
  outId: number,
  inId: number
) {
  const ms = await ensureMatchState(matchId);
  const lineup = isHomeTeam ? ms.homeLineup ?? [] : ms.awayLineup ?? [];
  const bench  = isHomeTeam ? ms.homeReserves ?? [] : ms.awayReserves ?? [];
  const subsRemaining = isHomeTeam ? ms.subsRemainingHome ?? 0 : ms.subsRemainingAway ?? 0;

  if (subsRemaining <= 0) {
    const err = new Error("NO_SUBS_REMAINING");
    (err as any).code = "NO_SUBS_REMAINING";
    throw err;
  }
  if (!lineup.includes(outId)) {
    const err = new Error("OUT_NOT_ON_FIELD");
    (err as any).code = "OUT_NOT_ON_FIELD";
    throw err;
  }
  if (!bench.includes(inId)) {
    const err = new Error("IN_NOT_ON_BENCH");
    (err as any).code = "IN_NOT_ON_BENCH";
    throw err;
  }

  // Check eligibility (not locked/injured)
  const incoming = await prisma.saveGamePlayer.findUnique({
    where: { id: inId },
    select: { lockedUntilNextMatchday: true },
  });
  if (!incoming) {
    const err = new Error("PLAYER_NOT_FOUND");
    (err as any).code = "PLAYER_NOT_FOUND";
    throw err;
  }
  if (incoming.lockedUntilNextMatchday) {
    const err = new Error("INJURED_UNAVAILABLE");
    (err as any).code = "INJURED_UNAVAILABLE";
    throw err;
  }

  return { ms, lineup, bench, subsRemaining };
}

/**
 * Perform a substitution with GK rules:
 *  - Only 1 GK may be on the field at any time.
 *  - out must be on-field for that side; in must be on the bench for that side and available.
 *  - Decrements side's subs remaining.
 * Returns updated PublicMatchState for that side.
 */
export async function performSubstitution(params: {
  matchId: number;
  isHomeTeam: boolean;
  outId: number;
  inId: number;
}): Promise<PublicMatchState> {
  const { matchId, isHomeTeam, outId, inId } = params;

  // Ensure state + basic validation
  const { ms, lineup, bench, subsRemaining } = await validateSubEligibility(
    matchId,
    isHomeTeam,
    outId,
    inId
  );

  // Enforce GK uniqueness (simulate the swap)
  await assertSingleGKAfterSwap(lineup, outId, inId);

  // Apply swap in memory
  removeIdOnce(lineup, outId);
  removeIdOnce(bench, inId);
  lineup.push(inId);

  // Persist state for correct side
  if (isHomeTeam) {
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: {
        homeLineup: lineup,
        homeReserves: bench,
        homeSubsMade: { increment: 1 },
        subsRemainingHome: Math.max(0, subsRemaining - 1),
      },
    });
  } else {
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: {
        awayLineup: lineup,
        awayReserves: bench,
        awaySubsMade: { increment: 1 },
        subsRemainingAway: Math.max(0, subsRemaining - 1),
      },
    });
  }

  // Ensure appearance row for the incoming player
  await ensureAppearance(inId, matchId);

  // Return updated public-facing state (with live injury flags)
  const updated = await getPublicMatchState(matchId, isHomeTeam ? "home" : "away");
  return updated;
}

/**
 * Used by FE to find which match the coach's team is in for the current matchday.
 * Mirrors `/matchday/team-match-info` contract.
 */
export async function getTeamMatchInfo(params: {
  saveGameId: number;
  matchday: number;
  teamId: number;
}): Promise<TeamMatchInfoDTO | null> {
  const { saveGameId, matchday, teamId } = params;

  const md = await prisma.matchday.findFirst({
    where: { saveGameId, number: matchday },
    select: { id: true },
  });
  if (!md) return null;

  const match = await prisma.saveGameMatch.findFirst({
    where: {
      matchdayId: md.id,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return null;

  return {
    matchId: match.id,
    isHomeTeam: match.homeTeamId === teamId,
  };
}

/* ----------------------------------------------------------------------------
 * Convenience: raw loader (if a route needs the full DB row)
 * ---------------------------------------------------------------------------- */
export async function loadRawMatchState(matchId: number): Promise<PrismaMatchState> {
  return ensureMatchState(matchId);
}
