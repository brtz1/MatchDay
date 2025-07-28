import prisma from '../utils/prisma';
import { getGameState } from './gameState';
import { generateLineup } from '../utils/formationHelper';
import { simulateMatch } from '../engine/simulateMatch';
import { broadcastEvent, broadcastMatchTick } from '../sockets/broadcast';
import { sleep } from '../utils/time';
import { applyAISubstitutions } from './halftimeService';

/**
 * Retrieves the persistent match state for a given match ID.
 */
export async function getMatchStateById(matchId: number) {
  return prisma.matchState.findUnique({
    where: { matchId },
  });
}

/**
 * Sets coach's formation, lineup, and bench for the given match/team.
 * Automatically selects the strongest available players by position.
 */
export async function setCoachFormation(
  matchId: number,
  teamId: number,
  formation: string,
  isHomeTeam: boolean
): Promise<void> {
  // Fetch all players on the team, ordered by rating descending
  const players = await prisma.saveGamePlayer.findMany({
    where: { teamId },
    orderBy: { rating: 'desc' },
  });

  // Build lineup and reserves arrays
  const { lineup, bench } = generateLineup(
    players.map(p => ({ id: p.id, rating: p.rating, position: p.position as 'GK' | 'DF' | 'MF' | 'AT' })),
    formation
  );

  const updateData = isHomeTeam
    ? {
        homeFormation: formation,
        homeLineup:    lineup,
        homeReserves:  bench,
        homeSubsMade:  0,
      }
    : {
        awayFormation: formation,
        awayLineup:    lineup,
        awayReserves:  bench,
        awaySubsMade:  0,
      };

  await prisma.matchState.upsert({
    where: { matchId },
    create: { matchId, ...updateData },
    update: updateData,
  });
}

/**
 * Applies a single substitution at halftime or thereafter.
 * Swaps outId from lineup with inId from reserves. Increments subs counter.
 */
export async function applySubstitution(
  matchId: number,
  outId: number,
  inId: number,
  isHomeTeam: boolean
): Promise<void> {
  const state = await getMatchStateById(matchId);
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

  // Perform swap
  lineup[lineup.indexOf(outId)] = inId;
  reserves[reserves.indexOf(inId)] = outId;
  subsMade += 1;

  // Persist updated state
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
 * Simulates every match in a given matchday in real-time,
 * broadcasting events and score ticks via WebSocket.
 */
export async function simulateMatchday(matchdayId: number): Promise<void> {
  // Fetch unplayed matches for this day
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId, played: false },
  });

  for (let minute = 1; minute <= 90; minute++) {
    // Tick each match
    for (const match of matches) {
      const state = await getMatchStateById(match.id);
      if (!state) continue;

      // Generate events for this minute
      const events = await simulateMatch(match, state, minute);
      for (const event of events) {
        const saved = await prisma.matchEvent.create({ data: event });
        broadcastEvent(saved);
      }

      // Broadcast current minute tick
      broadcastMatchTick(match.id, minute);
    }

    // Halftime substitutions
    if (minute === 45) {
      // Update global game stage
      await prisma.gameState.updateMany({ data: { gameStage: 'HALFTIME' } });

      const gs = await getGameState();
      const coachTeamId = gs?.coachTeamId;

      // Let AI-controlled teams make substitutions
      for (const match of matches) {
        if (match.homeTeamId !== coachTeamId && match.awayTeamId !== coachTeamId) {
          await applyAISubstitutions(match.id);
        }
      }

      // Pause real-time for halftime
      await sleep(10000);
    }

    // Real-time delay per minute
    await sleep(1000);
  }

  // Mark matches as played and advance game stage
  await Promise.all(
    matches.map(m =>
      prisma.saveGameMatch.update({ where: { id: m.id }, data: { played: true } })
    )
  );
  await prisma.gameState.updateMany({ data: { gameStage: 'RESULTS' } });
}
