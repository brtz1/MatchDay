import prisma from '../utils/prisma';

export const recordPlayerStats = async (
  playerId: number,
  matchId: number,
  goals: number,
  assists: number,
  yellow: number,
  red: number
) => {
  return prisma.playerMatchStats.create({
    data: {
      playerId,
      matchId,
      goals,
      assists,
      yellow,
      red,
    }
  });
};

export const getPlayerStats = async (playerId: number) => {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    include: { match: true }
  });
};
