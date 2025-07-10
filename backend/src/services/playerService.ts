// src/services/playerService.ts

import prisma from '../utils/prisma';
import { SaveGamePlayer } from '@prisma/client';

/**
 * Get all players for a given save game
 */
const getAllPlayers = async (saveGameId: number): Promise<SaveGamePlayer[]> => {
  return prisma.saveGamePlayer.findMany({
    where: { saveGameId },
    include: {
      team: true,
    },
  });
};

/**
 * Get a single player by ID (must be from a save game)
 */
const getPlayerById = async (id: number): Promise<SaveGamePlayer | null> => {
  return prisma.saveGamePlayer.findUnique({
    where: { id },
    include: {
      team: true,
    },
  });
};

/**
 * Create a new player within a save game
 */
const createPlayer = async (playerData: any): Promise<SaveGamePlayer> => {
  return prisma.saveGamePlayer.create({
    data: playerData,
  });
};

/**
 * Update a save game player
 */
const updatePlayer = async (id: number, playerData: any): Promise<SaveGamePlayer> => {
  return prisma.saveGamePlayer.update({
    where: { id },
    data: playerData,
  });
};

/**
 * Delete a player from a save game
 */
const deletePlayer = async (id: number): Promise<SaveGamePlayer> => {
  return prisma.saveGamePlayer.delete({
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
