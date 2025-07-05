import { PrismaClient } from '@prisma/client';
import loadJSON from '../src/utils/loadData';

const prisma = new PrismaClient();

async function seed() {
  const teams = loadJSON<any[]>('../src/data/teams.json');
  const referees = loadJSON<any[]>('../src/data/referees.json');

  // Seed Teams and Players
  for (const teamData of teams) {
    await prisma.team.create({
      data: {
        name: teamData.name,
        country: teamData.country,
        budget: teamData.budget,
        players: {
          create: teamData.players,
        },
      },
    });
  }

  // Seed Referees (if needed in your model)
  for (const referee of referees) {
    await prisma.referee.create({
      data: referee,
    });
  }

  console.log('Database seeded successfully!');
}

seed()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());