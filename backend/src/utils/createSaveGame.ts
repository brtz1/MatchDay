// src/utils/createSaveGame.ts

import prisma from './prisma';
import { DivisionTier } from '@prisma/client';

/**
 * Creates a new SaveGame snapshot from all BaseTeam/BasePlayer entries.
 * Assigns every base team to Division D4 and copies across all players.
 *
 * @param saveName – the name for the new save slot
 * @param coachName – optional coach name
 * @returns the new SaveGame.id
 */
export async function createSaveGameFromBase(
  saveName: string,
  coachName?: string
): Promise<number> {
  // 1. Create the SaveGame record
  const save = await prisma.saveGame.create({
    data: {
      name: saveName,
      coachName: coachName ?? '',
    },
  });

  // 2. Load all base teams with their players
  const baseTeams = await prisma.baseTeam.findMany({
    include: { players: true },
    orderBy: { id: 'asc' },
  });

  // 3. For each base team, create a SaveGameTeam and its players
  for (let teamIndex = 0; teamIndex < baseTeams.length; teamIndex++) {
    const baseTeam = baseTeams[teamIndex];

    // Assign all to Division D4 for this simple snapshot
    const saveTeam = await prisma.saveGameTeam.create({
      data: {
        saveGameId: save.id,
        baseTeamId: baseTeam.id,
        name: baseTeam.name,
        division: DivisionTier.D4,
        morale: 75,
        currentSeason: 1,
        localIndex: teamIndex,
      },
    });

    // Copy each player from the base roster into SaveGamePlayer
    for (let playerIndex = 0; playerIndex < baseTeam.players.length; playerIndex++) {
      const p = baseTeam.players[playerIndex];
      await prisma.saveGamePlayer.create({
        data: {
          saveGameId: save.id,
          basePlayerId: p.id,
          name: p.name,
          position: p.position,
          rating: p.rating,
          salary: p.salary,
          behavior: p.behavior ?? 3,
          contractUntil: 1,
          teamId: saveTeam.id,
          localIndex: playerIndex,
        },
      });
    }
  }

  // 4. Return the new saveGame ID
  return save.id;
}

export default createSaveGameFromBase;
