// src/utils/playerSync.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Creates players for a team using base data and adjusted ratings.
 */
export async function syncPlayersWithNewTeamRating(
  teamId: number,
  players: {
    id: number;
    name: string;
    position: string;
    nationality: string;
    salary: number;
    behavior: number;
  }[],
  teamRating: number
): Promise<void> {
  const newRatings = generatePlayerRatingsForTeam(teamRating, players.length);

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const updatedRating = newRatings[i];
    const salary = calculateSalary(updatedRating, p.behavior);

    await prisma.player.create({
      data: {
        name: p.name,
        position: p.position,
        nationality: p.nationality,
        rating: updatedRating,
        salary,
        behavior: p.behavior,
        contractUntil: 1,
        teamId,
      },
    });
  }
}

/**
 * Generates randomized ratings centered around teamRating.
 */
function generatePlayerRatingsForTeam(teamRating: number, count: number): number[] {
  const ratings: number[] = [];
  for (let i = 0; i < count; i++) {
    const variance = Math.floor(Math.random() * 11) - 5; // ±5
    ratings.push(clamp(teamRating + variance));
  }
  return ratings;
}

/**
 * Salary is based on player rating and behavior type.
 */
function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  const behaviorFactor = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * behaviorFactor);
}

/**
 * Ratings stay between 30 and 99.
 */
function clamp(value: number): number {
  return Math.max(30, Math.min(99, value));
}
