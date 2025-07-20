// backend/src/services/matchService.ts

import prisma from '@/utils/prisma';
import { getGameState } from './gameState';

/**
 * Retrieves the match state for a given match ID.
 */
export async function getMatchStateById(matchId: number) {
  return prisma.matchState.findUnique({
    where: { matchId },
  });
}

/**
 * Sets the formation-based lineup and bench for a team in a match.
 * Automatically selects strongest players by position.
 */
export async function setCoachFormation(
  matchId: number,
  teamId: number,
  formation: string,
  isHomeTeam: boolean
): Promise<void> {
  // … existing logic …
}

/**
 * Applies a halftime substitution for the coached team.
 * Swaps `outId` in the lineup with `inId` from reserves,
 * and increments the subs‐made counter.
 */
export async function applySubstitution(
  matchId: number,
  outId: number,
  inId: number,
  isHomeTeam: boolean
): Promise<void> {
  // 1) Load existing MatchState
  const state = await prisma.matchState.findUnique({
    where: { matchId },
  });
  if (!state) throw new Error(`MatchState for match ${matchId} not found`);

  // 2) Determine keys
  const lineupKey = isHomeTeam ? 'homeLineup' : 'awayLineup';
  const reserveKey = isHomeTeam ? 'homeReserves' : 'awayReserves';
  const subsKey = isHomeTeam ? 'homeSubsMade' : 'awaySubsMade';

  const lineup: number[] = [...(state as any)[lineupKey]];
  const reserves: number[] = [...(state as any)[reserveKey]];
  let subsMade: number = (state as any)[subsKey];

  // 3) Validate
  if (subsMade >= 3) throw new Error('No substitutions remaining');
  if (!lineup.includes(outId)) throw new Error('Player to sub out not in lineup');
  if (!reserves.includes(inId)) throw new Error('Player to sub in not on bench');

  // 4) Swap
  lineup[lineup.indexOf(outId)] = inId;
  reserves[reserves.indexOf(inId)] = outId;
  subsMade += 1;

  // 5) Persist
  await prisma.matchState.update({
    where: { matchId },
    data: {
      [lineupKey]: lineup,
      [reserveKey]: reserves,
      [subsKey]: subsMade,
    } as any,
  });
}

/**
 * Simulates all saveGameMatches for a given matchday.
 */
export async function simulateMatchday(matchdayId: number): Promise<void> {
  // … existing logic …
}

// … other helpers (averageRating, simulateScore, etc.) …
