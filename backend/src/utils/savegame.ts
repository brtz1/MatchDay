// src/utils/savegame.ts

import prisma from '../utils/prisma';
import { DivisionTier } from '@prisma/client';

/**
 * Creates a new SaveGame snapshot from all BaseTeam/BasePlayer entries.
 * All teams are assigned to Division D1 by default.
 *
 * @param saveName   – the name for the new save slot
 * @param coachName? – optional coach name
 * @returns the new SaveGame.id
 */
export async function createSaveGameFromBase(saveName: string, coachName?: string): Promise<number> {
  // 1. Create the SaveGame record
  const save = await prisma.saveGame.create({
    data: {
      name: saveName,
      coachName: coachName ?? '',
    },
  });

  // 2. Load all base teams with their players, ordered by id
  const baseTeams = await prisma.baseTeam.findMany({
    include: { players: true },
    orderBy: { id: 'asc' },
  });

  // 3. Copy each base team into SaveGameTeam and its players into SaveGamePlayer
  for (let teamIndex = 0; teamIndex < baseTeams.length; teamIndex++) {
    const base = baseTeams[teamIndex];

    // Create SaveGameTeam (include required 'rating')
    const saveTeam = await prisma.saveGameTeam.create({
      data: {
        saveGameId: save.id,
        baseTeamId: base.id,
        name: base.name,
        division: DivisionTier.D1,
        morale: 75,
        currentSeason: 1,
        localIndex: teamIndex,
        rating: base.rating, // ✅ Added required field
      },
    });

    // Create SaveGamePlayer entries for each player
    for (let playerIndex = 0; playerIndex < base.players.length; playerIndex++) {
      const p = base.players[playerIndex];
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

  return save.id;
}

export default createSaveGameFromBase;
