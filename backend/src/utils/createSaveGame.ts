// src/utils/createSaveGame.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSaveGameFromBase(saveName: string, coachName: string) {
  const save = await prisma.saveGame.create({
    data: { name: saveName, coachName },
  });

  const baseTeams = await prisma.baseTeam.findMany({
    include: {
      players: true,
    },
  });

  for (const base of baseTeams) {
    await prisma.saveGameTeam.create({
      data: {
        saveGameId: save.id,
        baseTeamId: base.id,
        name: base.name,
        division: 'D4',
        morale: 75,
        currentSeason: 1,
      },
    });

    for (const player of base.players) {
      await prisma.saveGamePlayer.create({
        data: {
          saveGameId: save.id,
          basePlayerId: player.id,
          name: player.name,
          position: player.position,
          rating: player.rating,
          salary: player.salary,
          contractUntil: 1,
          behavior: player.behavior,
          teamId: null,
        },
      });
    }
  }

  console.log(`💾 SaveGame '${saveName}' created with ${baseTeams.length} teams.`);
}

export default createSaveGameFromBase;
