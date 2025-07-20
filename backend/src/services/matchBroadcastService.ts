// Refactored backend/src/services/matchBroadcastService.ts

import prisma from '../utils/prisma';
import { broadcastEvent, broadcastGameStage } from '../socket';
import { GameStage, Match, Team, Player } from '@prisma/client';
import { getSocketIO } from '../socket';

const io = getSocketIO();
// io.emit('match-tick', { minute }); // Removed: 'minute' is not defined in this scope

export interface LiveEvent {
  matchdayId: number;
  matchId: number;
  minute: number;
  type: 'GOAL' | 'INJURY' | 'RED_CARD';
  playerId: number;
  message: string;
}

type BroadcastMatch = Match & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
};

const TOTAL_MINUTES = 90;
const SIMULATION_DURATION_MS = 90_000;
const TICK_MS = SIMULATION_DURATION_MS / TOTAL_MINUTES;

export async function broadcastMatchday(
  matchdayId: number,
  onEvent: (event: LiveEvent) => void
): Promise<void> {
  const matches = (await prisma.match.findMany({
    where: { matchdayId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  })) as BroadcastMatch[];

  for (let minute = 1; minute <= TOTAL_MINUTES; minute++) {
    io.emit('match-tick', { minute }); // 🔁 aligned socket name for frontend

    for (const match of matches) {
      const event = maybeGenerateEvent(minute, match);
      if (event) {
        onEvent(event);
        broadcastEvent(event);

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

    if (minute === 45) {
      await prisma.gameState.updateMany({ data: { gameStage: GameStage.HALFTIME } });
      broadcastGameStage(GameStage.HALFTIME);
    }

    if (minute === TOTAL_MINUTES) {
      await prisma.gameState.updateMany({ data: { gameStage: GameStage.RESULTS } });
      broadcastGameStage(GameStage.RESULTS);
    }

    await wait(TICK_MS);
  }

  await prisma.matchday.update({
    where: { id: matchdayId },
    data: { isPlayed: true },
  });
  await prisma.gameState.updateMany({ data: { gameStage: GameStage.STANDINGS } });
  broadcastGameStage(GameStage.STANDINGS);
}

function maybeGenerateEvent(minute: number, match: BroadcastMatch): LiveEvent | null {
  const chance = Math.random();

  if (chance < 0.02) {
    return makeEvent('GOAL', minute, match);
  }
  if (chance < 0.025) {
    return makeEvent('INJURY', minute, match);
  }
  if (chance < 0.03) {
    return makeEvent('RED_CARD', minute, match);
  }
  return null;
}

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
