// src/utils/playerSync.ts

import prisma from '../utils/prisma';
import { BaseTeam, BasePlayer, DivisionTier } from '@prisma/client';

type BaseTeamWithPlayers = BaseTeam & { players: BasePlayer[] };

/**
 * Updates SaveGamePlayer ratings and salaries based on their division assignment.
 *
 * @param saveGameId     – the active SaveGame ID
 * @param baseTeams      – all BaseTeam records with their BasePlayer[] attached
 * @param divisionMap    – map from DivisionTier to the subset of BaseTeamWithPlayers in that division
 */
export async function syncPlayersWithNewTeamRating(
  saveGameId: number,
  baseTeams: BaseTeamWithPlayers[],
  divisionMap: Record<DivisionTier, BaseTeamWithPlayers[]>
): Promise<void> {
  for (const [divisionKey, teams] of Object.entries(divisionMap) as [DivisionTier, BaseTeamWithPlayers[]][]) {
    const baseRating = getDivisionBaseRating(divisionKey);

    for (const baseTeam of teams) {
      // Find the corresponding SaveGameTeam for this base team
      const saveTeam = await prisma.saveGameTeam.findFirst({
        where: { saveGameId, baseTeamId: baseTeam.id },
      });
      if (!saveTeam) continue;

      // Generate new ratings for each player on that team
      const ratings = generatePlayerRatingsForTeam(baseRating, baseTeam.players.length);

      for (let i = 0; i < baseTeam.players.length; i++) {
        const bp = baseTeam.players[i];
        const rating = ratings[i];
        const salary = calculateSalary(rating, bp.behavior);

        // Bulk update the SaveGamePlayer entry
        await prisma.saveGamePlayer.updateMany({
          where: {
            saveGameId,
            basePlayerId: bp.id,
            teamId: saveTeam.id,
          },
          data: {
            rating,
            salary,
          },
        });
      }
    }
  }
}

function getDivisionBaseRating(division: DivisionTier): number {
  switch (division) {
    case DivisionTier.D1: return 95;
    case DivisionTier.D2: return 85;
    case DivisionTier.D3: return 75;
    case DivisionTier.D4: return 65;
    default: return 60;
  }
}

function generatePlayerRatingsForTeam(teamRating: number, count: number): number[] {
  const ratings: number[] = [];
  for (let i = 0; i < count; i++) {
    const variance = Math.floor(Math.random() * 11) - 5; // ±5
    ratings.push(clamp(teamRating + variance));
  }
  return ratings;
}

function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  const behaviorFactor = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * behaviorFactor);
}

function clamp(value: number): number {
  return Math.max(30, Math.min(99, value));
}
