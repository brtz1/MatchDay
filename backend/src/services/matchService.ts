import prisma from '../utils/prisma';

/**
 * Simulate all matches in a given matchday
 */
export const simulateMatchday = async (matchdayId: number) => {
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: {
      matches: {
        include: {
          homeTeam: {
            include: {
              players: true,
            },
          },
          awayTeam: {
            include: {
              players: true,
            },
          },
        },
      },
    },
  });

  if (!matchday || matchday.isPlayed) {
    throw new Error('Matchday not found or already played');
  }

  for (const match of matchday.matches) {
    const homeStrength = teamStrength(match.homeTeam.players);
    const awayStrength = teamStrength(match.awayTeam.players);

    const [homeScore, awayScore] = simulateScore(homeStrength, awayStrength);

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        isPlayed: true,
      },
    });

    await simulateMatchStats(
      match.id,
      matchdayId,
      match.homeTeam.players,
      homeScore
    );

    await simulateMatchStats(
      match.id,
      matchdayId,
      match.awayTeam.players,
      awayScore
    );
  }

  await prisma.matchday.update({
    where: { id: matchdayId },
    data: { isPlayed: true },
  });
};

/**
 * Calculate average team strength
 */
const teamStrength = (players: { rating: number }[]) => {
  return players.length === 0 ? 0 : players.reduce((sum, p) => sum + p.rating, 0) / players.length;
};

/**
 * Generate semi-random scores based on strength
 */
const simulateScore = (home: number, away: number): [number, number] => {
  const homeScore = Math.max(0, Math.round(home / 20 + Math.random() * 2));
  const awayScore = Math.max(0, Math.round(away / 20 + Math.random() * 2));
  return [homeScore, awayScore];
};

/**
 * Simulate match events for a list of players
 */
const simulateMatchStats = async (
  matchId: number,
  matchdayId: number,
  players: { id: number; behavior: number }[],
  goals: number
) => {
  const scorers = selectRandom(players, goals);

  for (const player of players) {
    const playerGoals = scorers.filter((p) => p.id === player.id).length;
    const yellow = Math.random() < 0.1 ? 1 : 0;
    const red = Math.random() < player.behavior * 0.03 ? 1 : 0;
    const assists = playerGoals > 0 ? Math.floor(Math.random() * playerGoals) : 0;

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

    if (playerGoals > 0) {
      await prisma.matchEvent.create({
        data: {
          matchId,
          matchdayId,
          minute: Math.floor(Math.random() * 90),
          eventType: 'GOAL',
          description: `Player ${player.id} scored`,
        },
      });
    }

    if (red > 0) {
      await prisma.matchEvent.create({
        data: {
          matchId,
          matchdayId,
          minute: Math.floor(Math.random() * 90),
          eventType: 'RED_CARD',
          description: `Player ${player.id} sent off`,
        },
      });
    }
  }
};

/**
 * Randomly select N elements from array
 */
const selectRandom = <T>(arr: T[], count: number): T[] => {
  const res: T[] = [];
  for (let i = 0; i < count; i++) {
    res.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  return res;
};
