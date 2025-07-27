import prisma from '../utils/prisma';
import { getGameState } from './gameState';
import { generateLineup } from '../utils/formationHelper';
import { simulateMatch } from '../engine/simulateMatch';
import { broadcastEvent, broadcastMatchTick } from '../sockets/broadcast';
import { sleep } from '../utils/time';
import { applyAISubstitutions } from './halftimeService';

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
  const players = await prisma.saveGamePlayer.findMany({
    where: { teamId },
    orderBy: { rating: 'desc' },
  });

  const { lineup, bench } = generateLineup(
    players.map(p => ({
      id: p.id,
      rating: p.rating,
      position: p.position as "GK" | "DF" | "MF" | "AT",
    })),
    formation
  );

  const updateData = isHomeTeam
    ? {
        homeFormation: formation,
        homeLineup: lineup,
        homeReserves: bench,
        homeSubsMade: 0,
      }
    : {
        awayFormation: formation,
        awayLineup: lineup,
        awayReserves: bench,
        awaySubsMade: 0,
      };

  await prisma.matchState.upsert({
    where: { matchId },
    create: {
      matchId,
      ...updateData,
    },
    update: updateData,
  });
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
  const state = await prisma.matchState.findUnique({
    where: { matchId },
  });
  if (!state) throw new Error(`MatchState for match ${matchId} not found`);

  const lineupKey = isHomeTeam ? 'homeLineup' : 'awayLineup';
  const reserveKey = isHomeTeam ? 'homeReserves' : 'awayReserves';
  const subsKey = isHomeTeam ? 'homeSubsMade' : 'awaySubsMade';

  const lineup: number[] = [...(state as any)[lineupKey]];
  const reserves: number[] = [...(state as any)[reserveKey]];
  let subsMade: number = (state as any)[subsKey];

  if (subsMade >= 3) throw new Error('No substitutions remaining');
  if (!lineup.includes(outId)) throw new Error('Player to sub out not in lineup');
  if (!reserves.includes(inId)) throw new Error('Player to sub in not on bench');

  lineup[lineup.indexOf(outId)] = inId;
  reserves[reserves.indexOf(inId)] = outId;
  subsMade += 1;

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
 * Runs real-time (1.5 minutes total), sends events + ticks via WebSocket.
 */
export async function simulateMatchday(matchdayId: number): Promise<void> {
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      matchdayId,
      played: false,
    },
  });

  for (let minute = 1; minute <= 90; minute++) {
    for (const match of matches) {
      const state = await prisma.matchState.findUnique({
        where: { matchId: match.id },
      });
      if (!state) continue;

      const events = await simulateMatch(match, state, minute);
      for (const event of events) {
        const saved = await prisma.matchEvent.create({ data: event });
        broadcastEvent(saved);
      }

      broadcastMatchTick(match.id, minute);
    }

    // Halftime
    if (minute === 45) {
      await prisma.gameState.updateMany({ data: { gameStage: "HALFTIME" } });

      const gameState = await getGameState();
      const coachTeamId = gameState?.coachTeamId;

      for (const match of matches) {
        if (
          match.homeTeamId !== coachTeamId &&
          match.awayTeamId !== coachTeamId
        ) {
          await applyAISubstitutions(match.id);
        }
      }

      await sleep(10000); // 10s real-time halftime pause
    }

    await sleep(1000); // 1s per simulated minute
  }

  // Mark all matches as played
  for (const match of matches) {
    await prisma.saveGameMatch.update({
      where: { id: match.id },
      data: { played: true },
    });
  }

  await prisma.gameState.updateMany({ data: { gameStage: "RESULTS" } });
}
