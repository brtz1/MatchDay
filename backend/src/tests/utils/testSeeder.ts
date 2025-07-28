// backend/src/tests/utils/testSeeder.ts
import prisma from '@/utils/prisma';

export async function seedBasicTestData() {
  // 1. Create save game
  const saveGame = await prisma.saveGame.create({
    data: { name: 'Test Save', coachName: 'Tester' }
  });

  // 2. Create two teams for that save
  const [team1, team2] = await Promise.all([
    prisma.saveGameTeam.create({
      data: {
        saveGameId: saveGame.id,
        baseTeamId: 1,
        name: 'Team One',
        division: 'D1',
        morale: 50,
        rating: 40,
        currentSeason: 1,
        localIndex: 0
      }
    }),
    prisma.saveGameTeam.create({
      data: {
        saveGameId: saveGame.id,
        baseTeamId: 2,
        name: 'Team Two',
        division: 'D1',
        morale: 50,
        rating: 38,
        currentSeason: 1,
        localIndex: 1
      }
    })
  ]);

  // 3. Link to GameState
  await prisma.gameState.upsert({
    where: { id: 1 },
    update: {
      currentSaveGameId: saveGame.id,
      coachTeamId: team1.id,
      currentMatchday: 1,
      gameStage: 'ACTION',
      matchdayType: 'LEAGUE'
    },
    create: {
      id: 1,
      currentSaveGameId: saveGame.id,
      coachTeamId: team1.id,
      currentMatchday: 1,
      gameStage: 'ACTION',
      matchdayType: 'LEAGUE'
    }
  });

  // 4. Create one referee for match tests
  const referee = await prisma.referee.create({
    data: {
      name: 'Ref A',
      country: 'Spain',
      strictness: 3
    }
  });

  return { saveGame, team1, team2, referee };
}
