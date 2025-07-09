// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const SALARY_MULTIPLIER = 1000;

function generatePlayerRating(teamRating: number, index: number): number {
  const variance = Math.floor(Math.random() * 5);
  const sign = index % 2 === 0 ? 1 : -1;
  return Math.max(30, Math.min(99, teamRating + (sign * variance)));
}

function calculateSalary(rating: number, behavior: number): number {
  const multiplier = 1 + (behavior - 3) * 0.1;
  return Math.round(rating * SALARY_MULTIPLIER * multiplier);
}

async function main() {
  const filePath = path.resolve(__dirname, '../src/data/teams.json');
  console.log('Resolved file path:', filePath);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);

  for (const team of json.teams) {
    const createdTeam = await prisma.baseTeam.create({
      data: {
        name: team.name,
        country: team.country,
        rating: team.rating,
        coachName: team.coachName,
        players: {
          create: team.players.map((player: any, index: number) => {
            const rating = generatePlayerRating(team.rating, index);
            return {
              name: player.name,
              nationality: player.nationality,
              position: player.position,
              behavior: player.behavior,
              rating,
              salary: calculateSalary(rating, player.behavior),
            };
          }),
        },
      },
    });

    console.log(`✅ Created base team: ${createdTeam.name}`);
  }
}

main()
  .then(() => {
    console.log('🌱 Base team seed complete');
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error('❌ Error during base team seed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
