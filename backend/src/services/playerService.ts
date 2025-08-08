// backend/src/services/playerService.ts

import prisma from '../utils/prisma';
import { SaveGamePlayer, Prisma } from '@prisma/client';
import { calculatePlayerPrice } from '../utils/playerValuator';

export type Position = 'GK' | 'DF' | 'MF' | 'AT';

export interface CreatePlayerDto {
  saveGameId: number;
  basePlayerId: number;
  name: string;
  position: Position;
  rating: number;
  salary: number;
  behavior: number;
  contractUntil: number;
  teamId: number;
  localIndex: number;
}

export type UpdatePlayerDto = Partial<
  Omit<CreatePlayerDto, 'saveGameId' | 'basePlayerId' | 'localIndex'>
>;

/**
 * Fetches all players in a given save game.
 */
export async function getAllPlayers(saveGameId: number): Promise<SaveGamePlayer[]> {
  return prisma.saveGamePlayer.findMany({
    where: { saveGameId },
    include: { team: true, basePlayer: true },
    orderBy: { localIndex: 'asc' },
  });
}

/**
 * Fetches a single player by ID within a save game.
 */
export async function getPlayerById(
  saveGameId: number,
  playerId: number
): Promise<SaveGamePlayer | null> {
  const player = await prisma.saveGamePlayer.findUnique({
    where: { id: playerId },
    include: { team: true, basePlayer: true },
  });
  if (!player || player.saveGameId !== saveGameId) return null;
  return player;
}

/**
 * Creates a new player in a save game.
 */
export async function createPlayer(data: CreatePlayerDto): Promise<SaveGamePlayer> {
  return prisma.saveGamePlayer.create({ data });
}

/**
 * Updates an existing SaveGamePlayer.
 */
export async function updatePlayer(
  saveGameId: number,
  playerId: number,
  updates: UpdatePlayerDto
): Promise<SaveGamePlayer> {
  const existing = await prisma.saveGamePlayer.findUnique({ where: { id: playerId } });
  if (!existing || existing.saveGameId !== saveGameId) {
    throw new Error(`Player ${playerId} not found in save ${saveGameId}`);
  }
  return prisma.saveGamePlayer.update({
    where: { id: playerId },
    data: updates,
  });
}

/**
 * Deletes a player from a save game.
 */
export async function deletePlayer(
  saveGameId: number,
  playerId: number
): Promise<SaveGamePlayer> {
  const existing = await prisma.saveGamePlayer.findUnique({ where: { id: playerId } });
  if (!existing || existing.saveGameId !== saveGameId) {
    throw new Error(`Player ${playerId} not found in save ${saveGameId}`);
  }
  return prisma.saveGamePlayer.delete({ where: { id: playerId } });
}

/**
 * Searches players in a save game using filters.
 */
export async function searchPlayers(
  saveGameId: number,
  filters: {
    name?: string;
    position?: Position;
    nationality?: string;
    priceMax?: number;
    ratingMin?: number;
    ratingMax?: number;
  }
): Promise<SaveGamePlayer[]> {
  const where: Prisma.SaveGamePlayerWhereInput = { saveGameId };

  if (filters.position) {
    where.position = filters.position;
  }
  if (filters.ratingMin != null || filters.ratingMax != null) {
    where.rating = {};
    if (filters.ratingMin != null) where.rating.gte = filters.ratingMin;
    if (filters.ratingMax != null) where.rating.lte = filters.ratingMax;
  }
  if (filters.name || filters.nationality) {
    where.basePlayer = {
      ...(filters.name && { name: { contains: filters.name, mode: 'insensitive' } }),
      ...(filters.nationality && {
        nationality: { contains: filters.nationality, mode: 'insensitive' },
      }),
    };
  }

  const players = await prisma.saveGamePlayer.findMany({
    where,
    include: { team: true, basePlayer: true },
    orderBy: { localIndex: 'asc' },
  });

  if (filters.priceMax != null) {
    return players.filter((p) =>
      calculatePlayerPrice(p.rating, p.behavior) <= filters.priceMax!
    );
  }

  return players;
}
