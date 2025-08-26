import prisma from '../utils/prisma';
import { applySubstitution } from './matchService';
import { getGameState } from './gameState';
import { ensureAppearanceRows } from './appearanceService';

/**
 * Normalize arbitrary position strings into our 4-way union.
 */
function normalizePos(p?: string | null): 'GK' | 'DF' | 'MF' | 'AT' {
  const s = (p ?? '').toUpperCase();
  if (s === 'GK' || s === 'G' || s === 'GOALKEEPER') return 'GK';
  if (s === 'DF' || s === 'D' || s === 'DEF' || s === 'DEFENDER') return 'DF';
  if (s === 'MF' || s === 'M' || s === 'MID' || s === 'MIDFIELDER') return 'MF';
  if (s === 'AT' || s === 'F' || s === 'FW' || s === 'ATT' || s === 'ATTACKER' || s === 'ST') return 'AT';
  return 'MF';
}

/**
 * Automatically (and optionally) apply halftime substitutions for non-coached teams.
 * - If there is no coach team defined, both teams are treated as AI.
 * - Prioritizes replacing injured players (from MatchEvent INJURY), then locked/suspended, then lowest-rated.
 * - Prefers same-position; GK must be replaced by GK.
 * - Once a player is subbed off, they do NOT return to the bench (enforced by applySubstitution).
 */
export async function applyAISubstitutions(matchId: number): Promise<void> {
  const match = await prisma.saveGameMatch.findUnique({ where: { id: matchId } });
  if (!match) return;

  const gameState = await getGameState().catch(() => null);
  const coachTeamId = gameState?.coachTeamId ?? null;

  // If we don't know the coached team, treat BOTH as AI.
  const isHomeAI = coachTeamId ? match.homeTeamId !== coachTeamId : true;
  const isAwayAI = coachTeamId ? match.awayTeamId !== coachTeamId : true;

  if (isHomeAI) await autoSubstituteSide(matchId, true);
  if (isAwayAI) await autoSubstituteSide(matchId, false);
}

async function autoSubstituteSide(matchId: number, isHome: boolean): Promise<void> {
  // Read the freshest state (it may have been updated earlier in the minute)
  const state = await prisma.matchState.findUnique({
    where: { saveGameMatchId: matchId },
  });
  if (!state) return;

  const lineupKey = isHome ? 'homeLineup' : 'awayLineup';
  const reserveKey = isHome ? 'homeReserves' : 'awayReserves';
  const subsKey = isHome ? 'homeSubsMade' : 'awaySubsMade';

  let lineup = Array.isArray((state as any)[lineupKey]) ? ([...(state as any)[lineupKey]] as number[]) : [];
  let reserves = Array.isArray((state as any)[reserveKey]) ? ([...(state as any)[reserveKey]] as number[]) : [];
  let subsMade = Number((state as any)[subsKey] ?? 0);

  // Remaining subs available
  const remaining = Math.max(0, 3 - subsMade);
  if (remaining === 0 || lineup.length === 0 || reserves.length === 0) return;

  // Load player meta for lineup + reserves
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: [...lineup, ...reserves] } },
    select: {
      id: true,
      name: true,
      rating: true,
      position: true,
      // Optional field in some schemas; used if present as a proxy for unavailability
      lockedUntilNextMatchday: true,
    },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  const pos = (id: number) => normalizePos(byId.get(id)?.position);
  const rating = (id: number) => (byId.get(id)?.rating ?? 0);
  const locked = (id: number) => Boolean(byId.get(id)?.lockedUntilNextMatchday);

  // Build INJURED set from events (keeps injured players ON FIELD; we only prioritize them for subs)
  const injuryEvents = await prisma.matchEvent.findMany({
    where: { saveGameMatchId: matchId, type: 'INJURY', saveGamePlayerId: { not: null } },
    select: { saveGamePlayerId: true },
  });
  const injuredSet = new Set<number>(injuryEvents.map((e) => e.saveGamePlayerId!));
  const isInjured = (id: number) => injuredSet.has(id);

  // Decide how many subs to attempt:
  // - Make at least the number of injured players on the field (up to remaining).
  // - Optionally add 0-2 extra subs (biased to 0/1) without exceeding remaining.
  const injuredOnField = lineup.filter((id) => isInjured(id));
  const base = Math.min(remaining, injuredOnField.length);
  const extraPool = [0, 0, 1, 1, 2];
  const extra = extraPool[Math.floor(Math.random() * extraPool.length)];
  const targetSubs = Math.min(remaining, base + extra);

  if (targetSubs === 0) return;

  // OUT candidates: injured first, then locked, then lowest rating
  const outCandidates = [...lineup].sort((a, b) => {
    // injured first
    if (isInjured(a) && !isInjured(b)) return -1;
    if (!isInjured(a) && isInjured(b)) return 1;
    // then locked/suspended
    if (locked(a) && !locked(b)) return -1;
    if (!locked(a) && locked(b)) return 1;
    // finally, by rating asc
    return rating(a) - rating(b);
  });

  // pick best IN for a given OUT
  const pickInForOut = (outId: number): number | undefined => {
    const outPos = pos(outId);
    // valid reserves that are not locked/suspended
    const valid = reserves.filter((id) => !locked(id));
    if (valid.length === 0) return undefined;

    if (outPos === 'GK') {
      const gks = valid.filter((id) => pos(id) === 'GK');
      if (gks.length === 0) return undefined;
      gks.sort((a, b) => rating(b) - rating(a)); // highest-rated GK
      return gks[0];
    }

    // Prefer same position; fallback to highest-rated any
    const same = valid.filter((id) => pos(id) === outPos);
    const pool = same.length > 0 ? same : valid;
    pool.sort((a, b) => rating(b) - rating(a));
    return pool[0];
  };

  let made = 0;
  for (const outId of outCandidates) {
    if (made >= targetSubs) break;

    const inId = pickInForOut(outId);
    if (!inId) continue;

    try {
      // Enforces GK rules and updates DB state
      await applySubstitution(matchId, outId, inId, isHome);

      // ✅ Redundant-safe: mark the incoming sub as "played" at entry time.
      // (applySubstitution already does this; calling again is harmless due to skipDuplicates.)
      await ensureAppearanceRows(matchId, [inId]);

      // Keep local copies in sync to inform subsequent picks in this loop
      const li = lineup.indexOf(outId);
      if (li >= 0) lineup[li] = inId;
      reserves = reserves.filter((id) => id !== inId); // "in" removed from bench; "out" not returned
      made++;
    } catch {
      // If applySubstitution rejected (e.g., GK rules/race), drop that inId and try next option
      reserves = reserves.filter((id) => id !== inId);
      continue;
    }
  }
}
