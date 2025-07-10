// src/services/teamService.ts
import prisma from '../utils/prisma';
import { DivisionTier } from '@prisma/client';

/**
 * Get all save game teams (with players)
 */
const getAllTeams = async () => {
  return prisma.saveGameTeam.findMany({
    include: {
      players: true,
    },
  });
};

/**
 * Get a single save game team by ID (with players)
 */
const getTeamById = async (id: number) => {
  return prisma.saveGameTeam.findUnique({
    where: { id },
    include: {
      players: true,
    },
  });
};

/**
 * Create a team in saveGame context
 */
const createTeam = async (teamData: {
  name: string;
  saveGameId: number;
  baseTeamId: number;
  morale?: number;
  division: DivisionTier;
}) => {
  const { name, saveGameId, baseTeamId, morale = 50, division } = teamData;
  return prisma.saveGameTeam.create({
    data: {
      name,
      baseTeamId,
      morale,
      currentSeason: 1,
      saveGameId,
      division, // Include division in the data
    },
  });
};

/**
 * Update a save game team
 */
const updateTeam = async (id: number, teamData: Partial<{ name: string; country:  string; rating: number }>) => {
  return prisma.saveGameTeam.update({
    where: { id },
    data: teamData,
  });
};

/**
 * Delete a save game team
 */
const deleteTeam = async (id: number) => {
  return prisma.saveGameTeam.delete({
    where: { id },
  });
};

export default {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
};
