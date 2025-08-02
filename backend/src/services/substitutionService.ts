// src/services/substitutionService.ts

import prisma from '../utils/prisma';
import {
  Player,
  MatchEvent as PrismaMatchEvent,
} from '@prisma/client';

export interface MatchLineup {
  matchId: number;
  homeLineup: number[];
  awayLineup: number[];
  homeReserves: number[];
  awayReserves: number[];
  homeSubsMade: number;
  awaySubsMade: number;
  isPaused: boolean;
  homePlayers: Player[];
  awayPlayers: Player[];
  events: {
    id: number;
    minute: number;
    eventType: string;
    description: string;
    playerId?: number;
  }[];
}

/**
 * Fetches the current match state plus available players and events.
 */
export async function getMatchLineup(matchId: number): Promise<MatchLineup> {
  const state = await prisma.matchState.findUnique({ where: { matchId } });
  if (!state) throw new Error(`MatchState not found for match ${matchId}`);

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });
  if (!match) throw new Error(`Match ${matchId} not found`);

  const events = await prisma.matchEvent.findMany({
    where: { matchId },
    orderBy: { minute: 'asc' },
  });

  return {
    matchId,
    homeLineup: state.homeLineup,
    awayLineup: state.awayLineup,
    homeReserves: state.homeReserves,
    awayReserves: state.awayReserves,
    homeSubsMade: state.homeSubsMade,
    awaySubsMade: state.awaySubsMade,
    isPaused: state.isPaused,
    homePlayers: match.homeTeam.players,
    awayPlayers: match.awayTeam.players,
    events: events.map((e: PrismaMatchEvent) => ({
      id: e.id,
      minute: e.minute,
      eventType: e.eventType,
      description: e.description,
      saveGamePlayerId: e.saveGamePlayerId ?? undefined,
    })),
  };
}

/**
 * Substitutes one player for another on the specified side.
 */
export async function submitSubstitution(
  matchId: number,
  side: 'home' | 'away',
  outPlayerId: number,
  inPlayerId: number
): Promise<void> {
  const state = await prisma.matchState.findUnique({ where: { matchId } });
  if (!state) throw new Error(`MatchState not found for match ${matchId}`);

  const isHome = side === 'home';
  const lineup = isHome ? [...state.homeLineup] : [...state.awayLineup];
  const reserves = isHome ? [...state.homeReserves] : [...state.awayReserves];
  const subsMade = isHome ? state.homeSubsMade : state.awaySubsMade;

  if (subsMade >= 3) throw new Error('Maximum 3 substitutions allowed');
  if (!lineup.includes(outPlayerId)) throw new Error('Out player not in lineup');
  if (!reserves.includes(inPlayerId)) throw new Error('In player not in reserves');

  const updatedLineup = lineup.map((id) =>
    id === outPlayerId ? inPlayerId : id
  );
  const updatedReserves = reserves.filter((id) => id !== inPlayerId).concat(outPlayerId);

  await prisma.matchState.update({
    where: { matchId },
    data: isHome
      ? {
          homeLineup: updatedLineup,
          homeReserves: updatedReserves,
          homeSubsMade: subsMade + 1,
        }
      : {
          awayLineup: updatedLineup,
          awayReserves: updatedReserves,
          awaySubsMade: subsMade + 1,
        },
  });
}

/**
 * Resumes a paused match.
 */
export async function resumeMatch(matchId: number): Promise<void> {
  await prisma.matchState.update({
    where: { matchId },
    data: { isPaused: false },
  });
}

/**
 * Performs automatic substitutions for AI teams:
 * prioritizes injured players, then fills remaining slots randomly.
 */
export async function runAISubstitutions(matchId: number): Promise<void> {
  const state = await prisma.matchState.findUnique({ where: { matchId } });
  if (!state) throw new Error(`MatchState not found for match ${matchId}`);

  const injuryEvents = await prisma.matchEvent.findMany({
    where: { matchId, eventType: 'INJURY' },
  });

  for (const side of ['home', 'away'] as const) {
    const isHome = side === 'home';
    let lineup = isHome ? [...state.homeLineup] : [...state.awayLineup];
    let reserves = isHome ? [...state.homeReserves] : [...state.awayReserves];
    let subsMade = isHome ? state.homeSubsMade : state.awaySubsMade;

    if (subsMade >= 3 || reserves.length === 0) continue;

    // Sub injured players first
    const injured = injuryEvents
      .map((e) => e.saveGamePlayerId)
      .filter((pid): pid is number => pid !== null)
      .filter((pid) => lineup.includes(pid));

    for (const out of injured) {
      if (subsMade >= 3 || reserves.length === 0) break;
      const inn = reserves.shift()!;
      lineup = lineup.map((id) => (id === out ? inn : id));
      subsMade++;
    }

    // Fill remaining subs randomly
    while (subsMade < 3 && reserves.length > 0) {
      const out = lineup[Math.floor(Math.random() * lineup.length)];
      const inn = reserves.shift()!;
      lineup = lineup.map((id) => (id === out ? inn : id));
      subsMade++;
    }

    await prisma.matchState.update({
      where: { matchId },
      data: isHome
        ? { homeLineup: lineup, homeReserves: reserves, homeSubsMade: subsMade }
        : { awayLineup: lineup, awayReserves: reserves, awaySubsMade: subsMade },
    });
  }
}
