// src/services/refereeService.ts

import prisma from '../utils/prisma';
import { Referee } from '@prisma/client';

/**
 * Fetches all referees (read-only).
 * @returns an array of Referee records.
 */
export async function getAllReferees(): Promise<Referee[]> {
  return prisma.referee.findMany();
}

/**
 * Fetches a single referee by ID (read-only).
 * @param id – the Referee.id to fetch.
 * @returns the Referee record or null if not found.
 */
export async function getRefereeById(id: number): Promise<Referee | null> {
  return prisma.referee.findUnique({
    where: { id },
  });
}

export default {
  getAllReferees,
  getRefereeById,
};
