import { PrismaClient, Team } from '@prisma/client';

const prisma = new PrismaClient();

const getAllTeams = async (): Promise<Team[]> => {
  return prisma.team.findMany({
    include: { players: true },
  });
};

const getTeamById = async (id: number): Promise<Team | null> => {
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

export default {
  getAllTeams,
  getTeamById,
  createTeam,
};