// src/services/matchBroadcastService.ts

import prisma from '../utils/prisma';
import { broadcastEvent, broadcastGameStage } from '../socket';
import { GameStage, Match, Team, Player } from '@prisma/client';

export interface LiveEvent {
  matchdayId: number;
  matchId: number;
  minute: number;
  type: 'GOAL' | 'INJURY' | 'RED_CARD';
  playerId: number;
  message: string;
}

/**
 * A Match record with its home/away teams including their player lists.
 */
type BroadcastMatch = Match & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
};

/** Total minutes and timing constants **/
const TOTAL_MINUTES = 90;
const SIMULATION_DURATION_MS = 90_000;
const TICK_MS = SIMULATION_DURATION_MS / TOTAL_MINUTES;

/**
 * Simulates and broadcasts a full matchday over ~90 seconds.
 *
 * @param matchdayId – the Matchday.id to broadcast
 * @param onEvent – callback invoked for each generated LiveEvent
 */
export async function broadcastMatchday(
  matchdayId: number,
  onEvent: (event: LiveEvent) => void
): Promise<void> {
  // 1. Load matches with full roster
  const matches = (await prisma.match.findMany({
    where: { matchdayId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  })) as BroadcastMatch[];

  // 2. Minute-by-minute simulation
  for (let minute = 1; minute <= TOTAL_MINUTES; minute++) {
    for (const match of matches) {
      const event = maybeGenerateEvent(minute, match);
      if (event) {
        onEvent(event);             // user callback
        broadcastEvent(event);      // socket broadcast

        // persist to DB
        await prisma.matchEvent.create({
          data: {
            matchdayId,
            matchId: event.matchId,
            minute: event.minute,
            eventType: event.type,
            description: event.message,
            playerId: event.playerId,
          },
        });
      }
    }

    // halftime
    if (minute === 45) {
      await prisma.gameState.updateMany({ data: { gameStage: GameStage.HALFTIME } });
      broadcastGameStage(GameStage.HALFTIME);
    }

    // full-time
    if (minute === TOTAL_MINUTES) {
      await prisma.gameState.updateMany({ data: { gameStage: GameStage.RESULTS } });
      broadcastGameStage(GameStage.RESULTS);
    }

    await wait(TICK_MS);
  }

  // 3. After simulation, mark played and move to standings
  await prisma.matchday.update({
    where: { id: matchdayId },
    data: { isPlayed: true },
  });
  await prisma.gameState.updateMany({ data: { gameStage: GameStage.STANDINGS } });
  broadcastGameStage(GameStage.STANDINGS);
}

/**
 * Randomly generates a GOAL, INJURY, or RED_CARD event.
 */
function maybeGenerateEvent(minute: number, match: BroadcastMatch): LiveEvent | null {
  const chance = Math.random();

  if (chance < 0.02) { // ~2% goal
    return makeEvent('GOAL', minute, match);
  }
  if (chance < 0.025) { // ~0.5% injury
    return makeEvent('INJURY', minute, match);
  }
  if (chance < 0.03) { // ~0.5% red card
    return makeEvent('RED_CARD', minute, match);
  }
  return null;
}

/**
 * Helper to construct a LiveEvent for GOAL, INJURY, or RED_CARD.
 */
function makeEvent(
  type: LiveEvent['type'],
  minute: number,
  match: BroadcastMatch
): LiveEvent {
  const isHome = Math.random() < 0.5;
  const team = isHome ? match.homeTeam : match.awayTeam;
  const player = team.players[Math.floor(Math.random() * team.players.length)];

  const icons: Record<LiveEvent['type'], string> = {
    GOAL: '⚽',
    INJURY: '🩼',
    RED_CARD: '🟥',
  };

  return {
    matchdayId: match.matchdayId,
    matchId: match.id,
    minute,
    type,
    playerId: player.id,
    message: `${icons[type]} ${type === 'GOAL' ? player.name : ''} ${
      type === 'INJURY' ? 'Injury' : type === 'RED_CARD' ? 'Red Card' : 'Goal'
    }: ${player.name} (${team.name}) at ${minute}'`,
  };
}

/** Simple sleep/delay **/
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
