import prisma from '../utils/prisma';
import { applySubstitution } from './matchService';
import { getGameState } from './gameState';

/**
 * Automatically apply halftime substitutions for non-coached teams.
 * Prioritizes injured or low-rated players, with a max of 3 subs per side.
 */
export async function applyAISubstitutions(matchId: number): Promise<void> {
  const match = await prisma.saveGameMatch.findUnique({ where: { id: matchId } });
  if (!match) return;

  const gameState = await getGameState();
  if (!gameState || !gameState.coachTeamId) return;

  const state = await prisma.matchState.findUnique({ where: { matchId } });
  if (!state) return;

  const isHomeAI = match.homeTeamId !== gameState.coachTeamId;
  const isAwayAI = match.awayTeamId !== gameState.coachTeamId;

  if (isHomeAI) await autoSubstituteSide(matchId, state, true);
  if (isAwayAI) await autoSubstituteSide(matchId, state, false);
}

/**
 * Substitutes players on one side of the match.
 * @param matchId Match ID
 * @param state MatchState object
 * @param isHome Whether to act on the home team
 */
async function autoSubstituteSide(
  matchId: number,
  state: any,
  isHome: boolean
): Promise<void> {
  const lineupKey = isHome ? 'homeLineup' : 'awayLineup';
  const reserveKey = isHome ? 'homeReserves' : 'awayReserves';
  const subsKey = isHome ? 'homeSubsMade' : 'awaySubsMade';

  const lineup = [...state[lineupKey]] as number[];
  const reserves = [...state[reserveKey]] as number[];
  let subsMade = state[subsKey] as number;

  if (subsMade >= 3) return;

  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: [...lineup, ...reserves] } },
    select: {
      id: true,
      rating: true,
      lockedUntilNextMatchday: true,
    },
  });

  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Sort lineup: injured/locked first, then lowest rating
  const lineupSorted = lineup.sort((a, b) => {
    const pA = playerMap.get(a);
    const pB = playerMap.get(b);
    if (!pA || !pB) return 0;
    if (pA.lockedUntilNextMatchday && !pB.lockedUntilNextMatchday) return -1;
    if (!pA.lockedUntilNextMatchday && pB.lockedUntilNextMatchday) return 1;
    return pA.rating - pB.rating;
  });

  // Sort reserves: highest rating first
  const reservesSorted = reserves.sort((a, b) => {
    const pA = playerMap.get(a);
    const pB = playerMap.get(b);
    return (pB?.rating ?? 0) - (pA?.rating ?? 0);
  });

  for (const outId of lineupSorted) {
    for (const inId of reservesSorted) {
      if (subsMade >= 3) return;
      try {
        await applySubstitution(matchId, outId, inId, isHome);
        subsMade++;
        break; // move to next player to sub out
      } catch {
        continue; // invalid sub, skip
      }
    }
  }
}
