// src/db/seed.ts

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { generatePlayerRating, calculateSalary } from '../utils/player'; // removed calculateValue

const prisma = new PrismaClient();

async function main() {
  const filePath = path.resolve(__dirname, '../data/teams.json');
  console.log('Resolved file path:', filePath);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);

  for (const team of json.teams) {
    const createdTeam = await prisma.team.create({
      data: {
        name: team.name,
        country: team.country,
        rating: team.rating,
        // coachName: team.coachName, ❌ removed: no longer exists
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
              // value: calculateValue(rating) ❌ removed: deprecated
            };
          }),
        },
      },
    });

    console.log(`✅ Created team: ${createdTeam.name}`);
  }
}

main()
  .then(() => {
    console.log('🌱 Team seed complete');
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error('❌ Error during team seed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
