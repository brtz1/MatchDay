// src/services/importService.ts

import prisma from '../utils/prisma';

export interface ImportPlayer {
  name: string;
  nationality?: string;
  position: string;
  rating: number;
  salary?: number;
  behavior?: number;
}

export interface ImportTeam {
  name: string;
  country: string;
  rating: number;
  coachName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  players?: ImportPlayer[];
}

/**
 * Handles importing a JSON dump of teams and players into the BaseTeam/BasePlayer tables.
 * Clears existing BaseTeam/BasePlayer data, then creates new records.
 *
 * @param data Object with a `teams` array of ImportTeam
 */
export async function handleImport(data: { teams: ImportTeam[] }): Promise<void> {
  if (!data || !Array.isArray(data.teams)) {
    throw new Error('Invalid import data: missing teams array');
  }

  // Wipe existing static data
  await prisma.$transaction([
    prisma.basePlayer.deleteMany(),
    prisma.baseTeam.deleteMany(),
  ]);

  // Import each team and its players
  for (const team of data.teams) {
    if (!team.name || !team.country || typeof team.rating !== 'number') {
      console.warn('Skipping invalid team entry:', team);
      continue;
    }

    const createdTeam = await prisma.baseTeam.create({
      data: {
        name: team.name,
        country: team.country,
        rating: team.rating,
        coachName: team.coachName ?? '',
        primaryColor: team.primaryColor ?? '#facc15',
        secondaryColor: team.secondaryColor ?? '#000000',
      },
    });

    if (Array.isArray(team.players)) {
      for (const player of team.players) {
        if (
          !player.name ||
          !player.position ||
          typeof player.rating !== 'number'
        ) {
          console.warn('Skipping invalid player entry:', player);
          continue;
        }

        await prisma.basePlayer.create({
          data: {
            name: player.name,
            nationality: player.nationality ?? 'Unknown',
            position: player.position,
            rating: player.rating,
            salary: player.salary ?? calculateSalary(player.rating),
            behavior: player.behavior ?? 3,
            teamId: createdTeam.id,
          },
        });
      }
    }
  }
}

/**
 * Fallback salary calculation if salary not provided.
 */
function calculateSalary(rating: number): number {
  if (rating >= 90) return 10000;
  if (rating >= 80) return 8000;
  if (rating >= 70) return 5000;
  if (rating >= 60) return 3000;
  return 1000;
}
