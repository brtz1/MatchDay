import prisma from '../utils/prisma';
import { MatchEventType } from '@prisma/client';

type Counters = { goals: number; yellow: number; red: number; injuries: number };

function tally(events: { type: MatchEventType }[]): Counters {
  const c: Counters = { goals: 0, yellow: 0, red: 0, injuries: 0 };
  for (const e of events) {
    switch (e.type) {
      case MatchEventType.GOAL: c.goals++; break;
      case MatchEventType.RED: c.red++; break;
      case MatchEventType.INJURY: c.injuries++; break;
      // add/adjust cases if your enum uses different names
    }
  }
  return c;
}

/** Recompute stats for ONE match from events (idempotent “set”, not increment). */
export async function syncStatsForMatch(saveGameMatchId: number) {
  // pull all player events for this match
  const evs = await prisma.matchEvent.findMany({
    where: { saveGameMatchId, saveGamePlayerId: { not: null } },
    select: { saveGamePlayerId: true, type: true },
  });

  // group by player
  const byPlayer = new Map<number, { type: MatchEventType }[]>();
  for (const e of evs) {
    const pid = e.saveGamePlayerId!;
    (byPlayer.get(pid) ?? byPlayer.set(pid, []).get(pid)!).push({ type: e.type });
  }

  // upsert per player
  for (const [pid, list] of byPlayer) {
    const c = tally(list);
    await prisma.saveGamePlayerMatchStats.upsert({
      where: { saveGamePlayerId_saveGameMatchId: { saveGamePlayerId: pid, saveGameMatchId } },
      create: { saveGamePlayerId: pid, saveGameMatchId, ...c, assists: 0 },
      update: { goals: c.goals, yellow: c.yellow, red: c.red, injuries: c.injuries },
    });
  }
}

/** Recompute stats for all matches in a matchday (idempotent). */
export async function syncStatsForMatchday(matchdayId: number) {
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId },
    select: { id: true },
  });
  for (const m of matches) await syncStatsForMatch(m.id);
}

/** Backfill entire save (idempotent). */
export async function backfillStatsForSave(saveGameId: number) {
  const matches = await prisma.saveGameMatch.findMany({
    where: { saveGameId },
    select: { id: true },
  });
  for (const m of matches) await syncStatsForMatch(m.id);
}
