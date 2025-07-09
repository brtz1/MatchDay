import prisma from '../utils/prisma';

/**
 * Initializes a new SaveGame from BaseTeam/BasePlayer
 */
export async function createSaveGameFromBase(saveName: string) {
  const save = await prisma.saveGame.create({
    data: {
      name: saveName,
    }
  });

  const baseTeams = await prisma.baseTeam.findMany({ include: { players: true } });

  for (const base of baseTeams) {
    const team = await prisma.saveGameTeam.create({
      data: {
        saveGameId: save.id,
        baseTeamId: base.id,
        name: base.name,
        division: 'FIRST',
        morale: 75,
        currentSeason: 1
      }
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
          contractUntil: 2028
        }
      });
    }
  }

  console.log(`💾 SaveGame '${saveName}' created.`);
}
