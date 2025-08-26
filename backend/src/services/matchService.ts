// backend/src/services/matchService.ts
import prisma from '../utils/prisma';
import { GameStage } from '@prisma/client';
import { getGameState } from './gameState';

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */
type Position = 'GK' | 'DF' | 'MF' | 'AT';

function normalizePos(p?: string | null): Position {
  const s = (p ?? '').toUpperCase();
  if (s === 'GK' || s === 'G' || s === 'GOALKEEPER') return 'GK';
  if (s === 'DF' || s === 'D' || s === 'DEF' || s === 'DEFENDER') return 'DF';
  if (s === 'MF' || s === 'M' || s === 'MID' || s === 'MIDFIELDER') return 'MF';
  if (s === 'AT' || s === 'F' || s === 'FW' || s === 'ATT' || s === 'ATTACKER' || s === 'ST') return 'AT';
  return 'MF';
}

/* -------------------------------------------------------------------------- */
/* Formation chosen by coach (from Formation tab before MATCHDAY)             */
/* -------------------------------------------------------------------------- */
/**
 * Persist the coach-selected formation & lineups into MatchState for the next match.
 * - Finds the coach team's next unplayed match in the active save.
 * - Writes lineup/reserves to the correct side (home vs away).
 * - Does not start the simulation itself.
 */
export async function setCoachFormation(
  saveGameId: number,
  formation: string,
  lineupIds: number[],
  reserveIds: number[]
) {
  const gs = await getGameState();
  if (!gs || gs.currentSaveGameId !== saveGameId || !gs.coachTeamId) {
    throw new Error('No active game/coach team for setCoachFormation');
  }
  const coachTeamId = gs.coachTeamId;

  // Find next unplayed match for this team
  const next = await prisma.saveGameMatch.findFirst({
    where: {
      saveGameId,
      isPlayed: false,
      OR: [{ homeTeamId: coachTeamId }, { awayTeamId: coachTeamId }],
    },
    orderBy: { id: 'asc' },
  });
  if (!next) throw new Error('No upcoming match for coach team');

  const isHome = next.homeTeamId === coachTeamId;

  // Upsert MatchState linked to this SaveGameMatch
  const existing = await prisma.matchState.findUnique({
    where: { saveGameMatchId: next.id },
  });

  if (!existing) {
    await prisma.matchState.create({
      data: {
        saveGameMatchId: next.id,
        homeFormation: isHome ? formation : '4-4-2',
        awayFormation: !isHome ? formation : '4-4-2',
        homeLineup: isHome ? lineupIds : [],
        awayLineup: !isHome ? lineupIds : [],
        homeReserves: isHome ? reserveIds : [],
        awayReserves: !isHome ? reserveIds : [],
        homeSubsMade: 0,
        awaySubsMade: 0,
        isPaused: false,
        subsRemainingHome: 3,
        subsRemainingAway: 3,
      },
    });
  } else {
    await prisma.matchState.update({
      where: { id: existing.id },
      data: {
        homeFormation: isHome ? formation : existing.homeFormation,
        awayFormation: !isHome ? formation : existing.awayFormation,
        homeLineup: isHome ? lineupIds : existing.homeLineup,
        awayLineup: !isHome ? lineupIds : existing.awayLineup,
        homeReserves: isHome ? reserveIds : existing.homeReserves,
        awayReserves: !isHome ? reserveIds : existing.awayReserves,
      },
    });
  }
}

/**
 * Ensure simulateMatch uses MatchState formations/lineups when present.
 * If not set, keep existing AI/default behavior. (Remove hard-coded 4-3-3 fallback.)
 */
export async function getFormationsForMatch(saveGameMatchId: number) {
  const state = await prisma.matchState.findUnique({ where: { saveGameMatchId } });
  if (!state) return null;
  return {
    home: {
      formation: state.homeFormation,
      lineup: state.homeLineup,
      reserves: state.homeReserves,
    },
    away: {
      formation: state.awayFormation,
      lineup: state.awayLineup,
      reserves: state.awayReserves,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* MatchState helpers used by matchStateRoute                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ensure a MatchState row exists for this SaveGameMatch ID.
 * Creates with safe defaults if missing.
 */
export async function ensureInitialMatchState(saveGameMatchId: number) {
  const existing = await prisma.matchState.findUnique({
    where: { saveGameMatchId },
  });
  if (existing) return existing;

  // Create with neutral defaults; real XI should be set by setCoachFormation beforehand.
  return prisma.matchState.create({
    data: {
      saveGameMatchId,
      homeFormation: '4-4-2',
      awayFormation: '4-4-2',
      homeLineup: [],
      awayLineup: [],
      homeReserves: [],
      awayReserves: [],
      homeSubsMade: 0,
      awaySubsMade: 0,
      isPaused: false,
      subsRemainingHome: 3,
      subsRemainingAway: 3,
    },
  });
}

/**
 * Fetch MatchState by SaveGameMatch ID.
 */
export async function getMatchStateById(saveGameMatchId: number) {
  return prisma.matchState.findUnique({ where: { saveGameMatchId } });
}

/**
 * Apply a substitution for a side.
 * - Validates subs remaining
 * - out must be on the field, in must be on the bench
 * - GK can only be swapped with GK
 * - Prevents two GKs on the field
 *
 * Throws errors with messages that match the route’s error mapping.
 */
export async function applySubstitution(
  saveGameMatchId: number,
  outId: number,
  inId: number,
  isHomeTeam: boolean
) {
  const ms = await prisma.matchState.findUnique({
    where: { saveGameMatchId },
  });
  if (!ms) throw new Error('MatchState not found');

  const lineup = isHomeTeam ? [...ms.homeLineup] : [...ms.awayLineup];
  const bench = isHomeTeam ? [...ms.homeReserves] : [...ms.awayReserves];

  const subsRemaining = isHomeTeam ? ms.subsRemainingHome : ms.subsRemainingAway;
  const subsMade = isHomeTeam ? ms.homeSubsMade : ms.awaySubsMade;

  if (!Array.isArray(lineup) || !Array.isArray(bench)) {
    throw new Error('Invalid match state arrays');
  }

  if ((subsRemaining ?? 0) <= 0) {
    throw new Error('No substitutions remaining');
  }

  const outIdx = lineup.indexOf(outId);
  if (outIdx === -1) {
    throw new Error('Selected outgoing player is not in lineup');
  }

  const inIdx = bench.indexOf(inId);
  if (inIdx === -1) {
    throw new Error('Selected incoming player is not on bench');
  }

  // Fetch positions to enforce GK rules
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: [outId, inId, ...lineup] } },
    select: { id: true, position: true },
  });
  const byId = new Map(players.map(p => [p.id, p]));
  const outPos = normalizePos(byId.get(outId)?.position);
  const inPos = normalizePos(byId.get(inId)?.position);

  // If outgoing is GK, incoming must be GK
  if (outPos === 'GK' && inPos !== 'GK') {
    throw new Error('Goalkeeper can only be substituted by another goalkeeper');
  }

  // If incoming is GK but outgoing is not GK, you'd end with two GKs
  if (outPos !== 'GK' && inPos === 'GK') {
    throw new Error('Cannot field two goalkeepers');
  }

  // Perform swap: replace out with in in lineup
  lineup[outIdx] = inId;

  // Remove incoming from bench, add outgoing to bench (so he can’t re-enter unless you allow it)
  bench.splice(inIdx, 1);
  // Optional: keep the outgoing on the bench for visualization
  bench.push(outId);

  // Persist updates
  const data = isHomeTeam
    ? {
        homeLineup: lineup,
        homeReserves: bench,
        homeSubsMade: (subsMade ?? 0) + 1,
        subsRemainingHome: Math.max(0, (subsRemaining ?? 0) - 1),
      }
    : {
        awayLineup: lineup,
        awayReserves: bench,
        awaySubsMade: (subsMade ?? 0) + 1,
        subsRemainingAway: Math.max(0, (subsRemaining ?? 0) - 1),
      };

  await prisma.matchState.update({
    where: { saveGameMatchId },
    data,
  });
}
