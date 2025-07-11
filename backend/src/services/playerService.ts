// src/services/playerService.ts

import prisma from '../utils/prisma';
import { SaveGamePlayer } from '@prisma/client';

/**
 * Fetches all players in a given save game.
 * @param saveGameId – ID of the SaveGame to scope the query.
 */
export async function getAllPlayers(saveGameId: number): Promise<SaveGamePlayer[]> {
  return prisma.saveGamePlayer.findMany({
    where: { saveGameId },
    include: { team: true },
  });
}

/**
 * Fetches a single player by ID within a save game.
 * @param saveGameId – ID of the SaveGame to scope the query.
 * @param playerId – ID of the SaveGamePlayer to fetch.
 */
export async function getPlayerById(
  saveGameId: number,
  playerId: number
): Promise<SaveGamePlayer | null> {
  return prisma.saveGamePlayer.findFirst({
    where: { id: playerId, saveGameId },
    include: { team: true },
  });
}

/**
 * Data needed to create a new SaveGamePlayer.
 */
export interface CreatePlayerDto {
  saveGameId: number;
  basePlayerId: number;
  name: string;
  position: string;
  rating: number;
  salary: number;
  behavior: number;
  contractUntil: number;
  teamId: number;
  localIndex: number;
}

/**
 * Creates a new player in a save game.
 * @param data – DTO for the new player.
 */
export async function createPlayer(
  data: CreatePlayerDto
): Promise<SaveGamePlayer> {
  return prisma.saveGamePlayer.create({
    data,
  });
}

/**
 * Partial data allowed for updates to a SaveGamePlayer.
 */
export type UpdatePlayerDto = Partial<
  Omit<CreatePlayerDto, 'saveGameId' | 'basePlayerId' | 'localIndex'>
>;

/**
 * Updates an existing SaveGamePlayer.
 * @param playerId – ID of the player to update.
 * @param saveGameId – ID of the SaveGame to scope the update.
 * @param updates – fields to update.
 */
export async function updatePlayer(
  saveGameId: number,
  playerId: number,
  updates: UpdatePlayerDto
): Promise<SaveGamePlayer> {
  // Ensure the player belongs to this save game
  const existing = await prisma.saveGamePlayer.findFirst({
    where: { id: playerId, saveGameId },
  });
  if (!existing) throw new Error(`Player ${playerId} not found in save ${saveGameId}`);

  return prisma.saveGamePlayer.update({
    where: { id: playerId },
    data: updates,
  });
}

/**
 * Deletes a player from a save game.
 * @param saveGameId – ID of the SaveGame to scope the deletion.
 * @param playerId – ID of the player to delete.
 */
export async function deletePlayer(
  saveGameId: number,
  playerId: number
): Promise<SaveGamePlayer> {
  // Ensure the player belongs to this save game
  const existing = await prisma.saveGamePlayer.findFirst({
    where: { id: playerId, saveGameId },
  });
  if (!existing) throw new Error(`Player ${playerId} not found in save ${saveGameId}`);

  return prisma.saveGamePlayer.delete({
    where: { id: playerId },
  });
}
