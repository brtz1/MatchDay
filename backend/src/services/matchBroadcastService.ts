// src/services/matchBroadcastService.ts

import prisma from '../utils/prisma';
import { broadcastEvent } from '../socket';

const TOTAL_MINUTES = 90;
const SIMULATION_DURATION_MS = 90 * 1000;
const TICK_MS = SIMULATION_DURATION_MS / TOTAL_MINUTES;

export async function broadcastMatchday(matchdayId: number, onEvent: (event: any) => void) {
  const matches = await prisma.match.findMany({
    where: { matchdayId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });

  for (let minute = 1; minute <= TOTAL_MINUTES; minute++) {
    for (const match of matches) {
      const event = maybeGenerateEvent(minute, match);
      if (event) {
        onEvent(event);
        broadcastEvent(event);

        await prisma.matchEvent.create({
          data: {
            matchdayId,
            matchId: match.id,
            minute: event.minute,
            eventType: event.type,
            description: event.message,
          },
        });
      }
    }

    // Automatically switch stages
    if (minute === 45) {
      await prisma.gameState.updateMany({ data: { gameStage: 'HALFTIME' } });
      broadcastEvent({ type: 'stage-changed', stage: 'HALFTIME' });
}

    if (minute === 90) {
      await prisma.gameState.updateMany({ data: { gameStage: 'RESULTS' } });
      broadcastEvent({ type: 'stage-changed', stage: 'RESULTS' });
    }

    await wait(TICK_MS);
  }

  await prisma.matchday.update({ where: { id: matchdayId }, data: { isPlayed: true } });
}

function maybeGenerateEvent(minute: number, match: any) {
  const chance = Math.random();
  const matchId = match.id;
  const home = match.homeTeam.name;
  const away = match.awayTeam.name;

  if (chance < 0.02) {
    const isHome = Math.random() > 0.5;
    const team = isHome ? match.homeTeam : match.awayTeam;
    const player = randomPlayer(team.players);

    return {
      matchdayId: match.matchdayId,
      matchId,
      type: 'GOAL',
      playerId: player.id,
      minute,
      message: `⚽ ${player.name} (${team.name}) scored at ${minute}'`,
    };
  }

  if (chance < 0.025) {
    const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
    const player = randomPlayer(team.players);

    return {
      matchdayId: match.matchdayId,
      matchId,
      type: 'INJURY',
      playerId: player.id,
      minute,
      message: `🩼 Injury: ${player.name} (${team.name}) at ${minute}'`,
    };
  }

  if (chance < 0.03) {
    const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
    const player = randomPlayer(team.players);

    return {
      matchdayId: match.matchdayId,
      matchId,
      type: 'RED_CARD',
      playerId: player.id,
      minute,
      message: `🟥 Red Card: ${player.name} (${team.name}) at ${minute}'`,
    };
  }

  return null;
}

function randomPlayer(players: any[]) {
  return players[Math.floor(Math.random() * players.length)];
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
