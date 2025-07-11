// src/services/matchService.ts

import prisma from '../utils/prisma';

/**
 * Simulate all matches in a given Matchday.
 * For each match, computes a semi-random score based on team strength,
 * persists the result, generates per-player stats and events,
 * and finally marks the Matchday as played.
 *
 * @param matchdayId – the ID of the Matchday to simulate
 */
export async function simulateMatchday(matchdayId: number): Promise<void> {
  // 1. Load matchday with teams and their players
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: {
      matches: {
        include: {
          homeTeam: { include: { players: true } },
          awayTeam: { include: { players: true } },
        },
      },
    },
  });
  if (!matchday) {
    throw new Error(`Matchday ${matchdayId} not found`);
  }
  if (matchday.isPlayed) {
    throw new Error(`Matchday ${matchdayId} has already been simulated`);
  }

  // 2. Simulate each match
  for (const match of matchday.matches) {
    const homeStrength = averageRating(match.homeTeam.players);
    const awayStrength = averageRating(match.awayTeam.players);
    const [homeScore, awayScore] = simulateScore(homeStrength, awayStrength);

    // Persist match result
    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        isPlayed: true,
      },
    });

    // Generate per-player stats and events for both sides
    await simulateMatchStats(match.id, matchdayId, match.homeTeam.players, homeScore);
    await simulateMatchStats(match.id, matchdayId, match.awayTeam.players, awayScore);
  }

  // 3. Mark the matchday itself as played
  await prisma.matchday.update({
    where: { id: matchdayId },
    data: { isPlayed: true },
  });
}

/**
 * Calculates the average rating of a list of players.
 */
function averageRating(players: { rating: number }[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, p) => sum + p.rating, 0);
  return total / players.length;
}

/**
 * Generates a semi-random score based on relative strengths.
 */
function simulateScore(home: number, away: number): [number, number] {
  const homeGoals = Math.max(0, Math.round(home / 20 + Math.random() * 2));
  const awayGoals = Math.max(0, Math.round(away / 20 + Math.random() * 2));
  return [homeGoals, awayGoals];
}

/**
 * Simulates individual player statistics and match events.
 */
async function simulateMatchStats(
  matchId: number,
  matchdayId: number,
  players: { id: number; behavior: number }[],
  goals: number
): Promise<void> {
  // Randomly select scorers
  const scorers = selectRandom(players, goals);

  for (const player of players) {
    const playerGoals = scorers.filter((p) => p.id === player.id).length;
    const yellow = Math.random() < 0.1 ? 1 : 0;
    const red = Math.random() < player.behavior * 0.03 ? 1 : 0;
    const assists = playerGoals > 0 ? Math.floor(Math.random() * playerGoals) : 0;

    // Record match stats
    await prisma.playerMatchStats.create({
      data: {
        playerId: player.id,
        matchId,
        goals: playerGoals,
        assists,
        yellow,
        red,
      },
    });

    // Emit goal events
    if (playerGoals > 0) {
      await prisma.matchEvent.create({
        data: {
          matchdayId,
          matchId,
          minute: Math.floor(Math.random() * 90) + 1,
          eventType: 'GOAL',
          description: `Player ${player.id} scored ${playerGoals} goal(s)`,
          playerId: player.id,
        },
      });
    }

    // Emit red card events
    if (red > 0) {
      await prisma.matchEvent.create({
        data: {
          matchdayId,
          matchId,
          minute: Math.floor(Math.random() * 90) + 1,
          eventType: 'RED_CARD',
          description: `Player ${player.id} sent off`,
          playerId: player.id,
        },
      });
    }
  }
}

/**
 * Randomly selects `count` elements from `arr` (with replacement).
 */
function selectRandom<T>(arr: T[], count: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  return result;
}
