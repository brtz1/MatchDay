import prisma from '../utils/prisma';
import { Referee } from '@prisma/client';

const getAllReferees = async (): Promise<Referee[]> => {
  return prisma.referee.findMany();
};

const getRefereeById = async (id: number): Promise<Referee | null> => {
  return prisma.referee.findUnique({
    where: { id },
  });
};

export default {
  getAllReferees,
  getRefereeById,
};