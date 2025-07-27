// backend/src/services/teamService.ts

import prisma from '../utils/prisma';
import { SaveGameTeam, DivisionTier } from '@prisma/client';

/**
 * Fetches all teams for a given save game, including their players.
 * @param saveGameId - ID of the SaveGame
 */
export async function getAllTeams(saveGameId: number): Promise<SaveGameTeam[]> {
  return prisma.saveGameTeam.findMany({
    where: { saveGameId },
    include: { players: true },
  });
}

/**
 * Fetches a single team by ID within a save game.
 * @param saveGameId - ID of the SaveGame
 * @param teamId - ID of the SaveGameTeam
 */
export async function getTeamById(
  saveGameId: number,
  teamId: number
): Promise<SaveGameTeam | null> {
  return prisma.saveGameTeam.findFirst({
    where: { id: teamId, saveGameId },
    include: { players: true },
  });
}

/**
 * Data required to create a SaveGameTeam.
 */
export interface CreateTeamDto {
  saveGameId: number;
  baseTeamId: number;
  name: string;
  division: DivisionTier;
  morale?: number;
  currentSeason?: number;
  localIndex: number;
  rating: number; // ✅ NEW REQUIRED FIELD
}

/**
 * Creates a new SaveGameTeam entry.
 * @param data - CreateTeamDto
 */
export async function createTeam(data: CreateTeamDto): Promise<SaveGameTeam> {
  const {
    saveGameId,
    baseTeamId,
    name,
    division,
    morale = 50,
    currentSeason = 1,
    localIndex,
    rating,
  } = data;

  return prisma.saveGameTeam.create({
    data: {
      saveGameId,
      baseTeamId,
      name,
      division,
      morale,
      currentSeason,
      localIndex,
      rating, // ✅ ADDING rating field
    },
  });
}

/**
 * Fields allowed to update on a SaveGameTeam.
 */
export type UpdateTeamDto = Partial<Pick<SaveGameTeam, 'name' | 'morale' | 'currentSeason'>>;

/**
 * Updates a SaveGameTeam by ID after verifying it exists in the correct save.
 * @param saveGameId - ID of the SaveGame
 * @param teamId - ID of the SaveGameTeam
 * @param updates - Partial update fields
 */
export async function updateTeam(
  saveGameId: number,
  teamId: number,
  updates: UpdateTeamDto
): Promise<SaveGameTeam> {
  const existing = await prisma.saveGameTeam.findFirst({
    where: { id: teamId, saveGameId },
  });

  if (!existing) {
    throw new Error(`Team ${teamId} not found in save game ${saveGameId}`);
  }

  return prisma.saveGameTeam.update({
    where: { id: teamId },
    data: updates,
  });
}

/**
 * Deletes a SaveGameTeam by ID after verifying it belongs to the save game.
 * @param saveGameId - ID of the SaveGame
 * @param teamId - ID of the SaveGameTeam
 */
export async function deleteTeam(
  saveGameId: number,
  teamId: number
): Promise<SaveGameTeam> {
  const existing = await prisma.saveGameTeam.findFirst({
    where: { id: teamId, saveGameId },
  });

  if (!existing) {
    throw new Error(`Team ${teamId} not found in save game ${saveGameId}`);
  }

  return prisma.saveGameTeam.delete({
    where: { id: teamId },
  });
}

export default {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
};
