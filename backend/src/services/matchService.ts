import prisma from '../utils/prisma';
import { getGameState } from './gameState';
import { generateLineup } from '../utils/formationHelper';
import { simulateMatch } from '../engine/simulateMatch';
import { broadcastEvent, broadcastMatchTick } from '../sockets/broadcast';
import { sleep } from '../utils/time';
import { applyAISubstitutions } from './halftimeService';
import { GameStage } from '@prisma/client';

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
  formation: string,
  isHomeTeam: boolean
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  // 1. Find the saveGameMatch record to know which saveGame and teams
  const saveMatch = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true, saveGameId: true },
  });
  if (!saveMatch) throw new Error(`SaveGameMatch ${matchId} not found`);

  const teamId = isHomeTeam ? saveMatch.homeTeamId : saveMatch.awayTeamId;

  // 2. Load all players of that team
  const players = await prisma.saveGamePlayer.findMany({
    where: { teamId },
    select: { id: true, position: true, rating: true },
  });

  // 3. Cast each player's position to the known union type for lineup generation
  const typedPlayers = players.map(p => ({
    id: p.id,
    position: p.position as 'GK' | 'DF' | 'MF' | 'AT',
    rating: p.rating,
  }));

  // 4. Generate lineup and bench based on formation
  const { lineup, bench } = generateLineup(typedPlayers, formation);

  // 5. Build homeData and awayData objects
  const homeData = {
    homeFormation: formation,
    homeLineup: lineup,
    homeReserves: bench,
    homeSubsMade: 0,
  };
  const awayData = {
    awayFormation: formation,
    awayLineup: lineup,
    awayReserves: bench,
    awaySubsMade: 0,
  };

  // Upsert the matchState row
  await prisma.matchState.upsert({
    where: { matchId },
    create: isHomeTeam
      ? { matchId, ...homeData }
      : { matchId, ...awayData },
    update: isHomeTeam ? homeData : awayData,
  });

  // Advance the global gameStage to MATCHDAY
  const gsRow = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveMatch.saveGameId },
    select: { id: true },
  });
  if (gsRow) {
    await prisma.gameState.update({
      where: { id: gsRow.id },
      data: { gameStage: GameStage.MATCHDAY },
    });
  }

  return { matchId, isHomeTeam };
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
  const saved = await prisma.matchEvent.create({
    data: {
      matchdayId: event.matchdayId,
      minute: event.minute,
      eventType: event.eventType,
      description: event.description,
      saveGamePlayerId: event.saveGamePlayerId, // ✅ the only correct key now
      saveGameMatchId: match.id,
    },
  });
}


      // Broadcast current minute tick
      broadcastMatchTick(match.id, minute);
    }

    // Halftime substitutions
    if (minute === 45) {
      await prisma.gameState.updateMany({ data: { gameStage: GameStage.HALFTIME } });
      const gs = await getGameState();
      const coachTeamId = gs?.coachTeamId;

      for (const match of matches) {
        if (match.homeTeamId !== coachTeamId && match.awayTeamId !== coachTeamId) {
          await applyAISubstitutions(match.id);
        }
      }

      // Pause for halftime
      await sleep(10000);
    }

    // Real-time delay per minute
    await sleep(1000);
  }

  // Mark matches as played and advance game stage to RESULTS
  await Promise.all(
    matches.map((m) =>
      prisma.saveGameMatch.update({ where: { id: m.id }, data: { played: true } })
    )
  );
  await prisma.gameState.updateMany({ data: { gameStage: GameStage.RESULTS } });
}
