// src/utils/playerSync.ts

import prisma from '../utils/prisma';

/**
 * Sync all players from base teams with ratings and salaries into SaveGamePlayers
 */
export async function syncPlayersWithNewTeamRating(
  saveGameId: number,
  baseTeams: {
    id: number;
    players: {
      id: number;
      name: string;
      position: string;
      behavior: number;
    }[];
  }[],
  divisionMap: Record<string, { id: number }[]>
): Promise<void> {
  for (const [division, baseTeamList] of Object.entries(divisionMap)) {
    for (const baseTeam of baseTeamList) {
      const teamId = baseTeam.id;
      const matchingBase = baseTeams.find(bt => bt.id === teamId);
      if (!matchingBase) continue;

      const playerCount = matchingBase.players.length;
      const teamAvgRating = getDivisionBaseRating(division);
      const ratings = generatePlayerRatingsForTeam(teamAvgRating, playerCount);

      for (let i = 0; i < playerCount; i++) {
        const basePlayer = matchingBase.players[i];
        const rating = ratings[i];
        const salary = calculateSalary(rating, basePlayer.behavior);

        await prisma.saveGamePlayer.updateMany({
          where: {
            saveGameId,
            basePlayerId: basePlayer.id,
            teamId,
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

function getDivisionBaseRating(division: string): number {
  switch (division) {
    case 'D1': return 85;
    case 'D2': return 75;
    case 'D3': return 65;
    case 'D4': return 55;
    default: return 60;
  }
}

function generatePlayerRatingsForTeam(teamRating: number, count: number): number[] {
  const ratings: number[] = [];
  for (let i = 0; i < count; i++) {
    const variance = Math.floor(Math.random() * 11) - 5;
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
