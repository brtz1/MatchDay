import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  await prisma.coach.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.division.deleteMany();

  const d1 = await prisma.division.create({
    data: { name: 'D1', level: 1 }
  });

  const team1 = await prisma.team.create({
    data: {
      name: 'Porto FC',
      country: 'Portugal',
      budget: 1000000,
      divisionId: d1.id,
      ticketPrice: 5,
      coach: {
        create: {
          name: 'Coach Porto',
          morale: 80,
          contractWage: 10000,
          contractUntil: 2026  // fixed as Int
        }
      },
      players: {
        create: [
          {
            name: 'Player 1',
            position: 'GK',
            rating: 75,
            salary: 2000,
            nationality: '🇵🇹'
          },
          {
            name: 'Player 2',
            position: 'DF',
            rating: 78,
            salary: 2500,
            nationality: '🇵🇹'
          }
        ]
      }
    }
  });

  const team2 = await prisma.team.create({
    data: {
      name: 'Benfica FC',
      country: 'Portugal',
      budget: 1000000,
      divisionId: d1.id,
      ticketPrice: 5,
      coach: {
        create: {
          name: 'Coach Benfica',
          morale: 75,
          contractWage: 9000,
          contractUntil: 2026  // fixed as Int
        }
      },
      players: {
        create: [
          {
            name: 'Player 3',
            position: 'MF',
            rating: 80,
            salary: 3000,
            nationality: '🇵🇹'
          },
          {
            name: 'Player 4',
            position: 'AT',
            rating: 82,
            salary: 4000,
            nationality: '🇵🇹'
          }
        ]
      }
    }
  });

  console.log(`✅ Seed completed.`);
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
