import { PrismaClient } from '@prisma/client';
import loadJSON from '../src/utils/loadData';

const prisma = new PrismaClient();

async function seed() {
  try {
    // Load team and referee JSON data (fixed paths)
    const teams = loadJSON<any[]>('../data/teams.json');
    const referees = loadJSON<any[]>('../data/referees.json');

    console.log(`Seeding ${teams.length} teams...`);
    for (const teamData of teams) {
      await prisma.team.create({
        data: {
          name: teamData.name,
          country: teamData.country,
          budget: teamData.budget,
          players: {
            create: teamData.players.map((player: any) => ({
              name: player.name,
              age: player.age,
              position: player.position,
              rating: player.rating,
              value: player.value,
              salary: player.salary,
            })),
          },
        },
      });
    }

    console.log(`Seeding ${referees.length} referees...`);
    for (const referee of referees) {
      await prisma.referee.create({
        data: {
          name: referee.name,
          country: referee.country,
          strictness: referee.strictness,
        },
      });
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();