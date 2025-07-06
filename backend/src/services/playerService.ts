import prisma from '../utils/prisma';
import { Player } from '@prisma/client';

const getAllPlayers = async (): Promise<Player[]> => {
  return prisma.player.findMany({
    include: { team: true },
  });
};

const getPlayerById = async (id: number): Promise<Player | null> => {
  return prisma.player.findUnique({
    where: { id },
    include: { team: true },
  });
};

const createPlayer = async (playerData: any): Promise<Player> => {
  // Create a new player (teamId may be undefined for free agents)
  return prisma.player.create({
    data: playerData,
  });
};

const updatePlayer = async (id: number, playerData: any): Promise<Player> => {
  return prisma.player.update({
    where: { id },
    data: playerData,
  });
};

const deletePlayer = async (id: number): Promise<Player> => {
  return prisma.player.delete({
    where: { id },
  });
};

export default {
  getAllPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
};