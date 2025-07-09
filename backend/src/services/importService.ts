// src/services/importService.ts

import prisma from '../utils/prisma';

// Optional: Replace this with your own game logic
const calculateSalary = (rating: number): number => {
  if (rating >= 90) return 10000;
  if (rating >= 80) return 8000;
  if (rating >= 70) return 5000;
  if (rating >= 60) return 3000;
  return 1000;
};

export const handleImport = async (data: any) => {
  for (const team of data.teams) {
    const createdTeam = await prisma.team.create({
      data: {
        name: team.name,
        country: team.country,
        rating: team.rating,
      },
    });

    if (team.players && Array.isArray(team.players)) {
      for (const player of team.players) {
        const rating = player.rating || 50;
        const salary = calculateSalary(rating);

        await prisma.player.create({
          data: {
            name: player.name,
            position: player.position,
            teamId: createdTeam.id,
            nationality: player.nationality || 'Unknown',
            rating,
            salary,
          },
        });
      }
    }
  }
};
