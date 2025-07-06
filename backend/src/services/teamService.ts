import prisma from '../utils/prisma';
import { Team } from '@prisma/client';

const getAllTeams = async (): Promise<Team[]> => {
  return prisma.team.findMany({
    include: { players: true },
  });
};

const getTeamById = async (id: number): Promise<(Team & { players: any[] }) | null> => {
  return prisma.team.findUnique({
    where: { id },
    include: { players: true },
  });
};

const createTeam = async (teamData: any): Promise<Team> => {
  const { name, country, budget } = teamData;
  return prisma.team.create({
    data: { name, country, budget },
  });
};

const updateTeam = async (id: number, teamData: any): Promise<Team> => {
  return prisma.team.update({
    where: { id },
    data: teamData,
  });
};

const deleteTeam = async (id: number): Promise<Team> => {
  return prisma.team.delete({
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