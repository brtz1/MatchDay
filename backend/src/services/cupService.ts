// backend/src/services/cupService.ts

import prisma from '../utils/prisma';
import { MatchdayType } from '@prisma/client';
import { broadcastCupRoundCreated } from '../sockets/broadcast';

/**
 * Retrieves the full cup bracket for the given saveGameId,
 * grouped by round (matchday number).
 */
export async function getCupLog(saveGameId: number) {
  const matchday = await prisma.matchday.findMany({
    where: {
      saveGameId,
      type: MatchdayType.CUP,
    },
    orderBy: { number: 'asc' },
    include: {
      saveGameMatches: {
        where: { saveGameId },
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
  });

  return matchday.map((md) => ({
    matchdayNumber: md.number,
    stage: mapCupStage(md.number),
    matches: md.saveGameMatches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam.name,
      homeTeamId: m.homeTeam.id,
      awayTeam: m.awayTeam.name,
      awayTeamId: m.awayTeam.id,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      // Some schemas no longer have a 'played' flag — infer from goals
      isPlayed: m.homeGoals !== null && m.awayGoals !== null,
    })),
  }));
}

/* ----------------------------------------------------------------------------
 * Advancing rounds (consume winners, including PK-decided matches)
 * ---------------------------------------------------------------------------- */

/**
 * Returns true if EVERY match in a given cup round has a clear winner.
 * A "clear winner" means homeGoals !== awayGoals. (PK shootouts should
 * be reflected by bumping the winner by +1 on the scoreboard.)
 */
export async function isCupRoundComplete(saveGameId: number, roundNumber: number): Promise<boolean> {
  const md = await prisma.matchday.findFirst({
    where: { saveGameId, number: roundNumber, type: MatchdayType.CUP },
    select: {
      id: true,
      saveGameMatches: {
        select: { homeGoals: true, awayGoals: true },
      },
    },
  });
  if (!md) return false;
  if (!md.saveGameMatches.length) return false;
  return md.saveGameMatches.every((m) => typeof m.homeGoals === 'number' && typeof m.awayGoals === 'number' && m.homeGoals !== m.awayGoals);
}

/**
 * Compute the winners (teamIds) for a given cup round.
 * Assumes ties have already been broken (ET/PK), i.e., homeGoals !== awayGoals.
 */
export async function getCupRoundWinners(saveGameId: number, roundNumber: number): Promise<number[]> {
  const md = await prisma.matchday.findFirst({
    where: { saveGameId, number: roundNumber, type: MatchdayType.CUP },
    select: {
      id: true,
      saveGameMatches: {
        orderBy: { id: 'asc' },
        select: { homeTeamId: true, awayTeamId: true, homeGoals: true, awayGoals: true },
      },
    },
  });
  if (!md) return [];

  const winners: number[] = [];
  for (const m of md.saveGameMatches) {
    if (typeof m.homeGoals !== 'number' || typeof m.awayGoals !== 'number') continue;
    if (m.homeGoals === m.awayGoals) {
      // If this ever happens, the shootout result wasn't reflected on the scoreboard.
      // We skip ambiguous matches to keep bracket generation safe.
      continue;
    }
    winners.push(m.homeGoals > m.awayGoals ? m.homeTeamId : m.awayTeamId);
  }
  return winners;
}

/**
 * Create (or reuse) the next cup matchday and pair winners in order.
 * - Pairs are [winners[0] vs winners[1]], [2] vs [3], etc.
 * - If next round already exists, this is idempotent and will not duplicate matches.
 * - Emits `cup-round-created` when a new round is created.
 *
 * Returns the next round matchday id (or null if not created).
 */
export async function advanceCupRound(saveGameId: number, fromRoundNumber: number): Promise<number | null> {
  // Ensure the current round is complete (all winners known)
  const complete = await isCupRoundComplete(saveGameId, fromRoundNumber);
  if (!complete) return null;

  const winners = await getCupRoundWinners(saveGameId, fromRoundNumber);
  if (winners.length < 2) return null; // nothing to pair

  const nextNumber = fromRoundNumber + 1;

  // Check if next round already exists
  const existing = await prisma.matchday.findFirst({
    where: { saveGameId, number: nextNumber, type: MatchdayType.CUP },
    select: { id: true, saveGameMatches: { select: { id: true } } },
  });

  if (existing && existing.saveGameMatches.length > 0) {
    // Already created — do nothing
    return existing.id;
  }

  // Load teams with names to materialize SaveGameMatches
  const teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId, id: { in: winners } },
    select: { id: true },
  });
  const validIds = new Set(teams.map((t) => t.id));
  const filtered = winners.filter((id) => validIds.has(id));

  // Pair winners in order; if odd count, the last team gets a BYE (carry to next round).
  const pairs: Array<{ homeTeamId: number; awayTeamId: number }> = [];
  for (let i = 0; i + 1 < filtered.length; i += 2) {
    pairs.push({ homeTeamId: filtered[i], awayTeamId: filtered[i + 1] });
  }

  if (!pairs.length) return null;

  // Create next round and its matches in a transaction
  const created = await prisma.$transaction(async (tx) => {
    const md = await tx.matchday.create({
      data: {
        saveGameId,
        number: nextNumber,
        type: MatchdayType.CUP,
      },
      select: { id: true },
    });

    await tx.saveGameMatch.createMany({
      data: pairs.map((p) => ({
        saveGameId,
        matchdayId: md.id,
        homeTeamId: p.homeTeamId,
        awayTeamId: p.awayTeamId,
      })),
    });

    return md.id;
  });

  // Notify UI: a new round exists
  broadcastCupRoundCreated(saveGameId, {
    roundLabel: mapCupStage(nextNumber),
    matchdayNumber: nextNumber,
    matchdayId: created,
    matches: pairs.length,
  });

  return created;
}

/* ----------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------- */

/**
 * Maps actual matchday numbers to their cup stage name.
 * (Adjust mapping to your calendar if needed.)
 */
function mapCupStage(number: number): string {
  const stageMap: Record<number, string> = {
    15: 'Round of 128',
    16: 'Round of 64',
    17: 'Round of 32',
    18: 'Round of 16',
    19: 'Quarterfinal',
    20: 'Semifinal',
    21: 'Final',
  };
  return stageMap[number] ?? `Matchday ${number}`;
}
