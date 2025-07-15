// src/services/createSaveGame.ts

import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from './gameState';
import { SaveGame, SaveGameTeam, SaveGamePlayer, SaveGameMatch } from '@prisma/client';

/**
 * Snapshot the current save into a brand-new SaveGame.
 *
 * Copies all teams, players, and matches (with their scores)
 * from the active save into a new SaveGame record, preserving
 * localIndex values (0–127 for teams; 0–19 for players).
 *
 * @param name - the name for the new save slot
 * @param coachName - optional coach name override
 * @returns the new saveGame.id
 */
export async function createSaveGame(
  name: string,
  coachName?: string
): Promise<number> {
  // 1. Determine the current active save
  const currentSaveId = await getCurrentSaveGameId();
  if (typeof currentSaveId !== 'number') {
    throw new Error('No active SaveGame to snapshot');
  }

  // 2. Fetch the full current save, including teams, players, and matches
  const oldSave = await prisma.saveGame.findUnique({
    where: { id: currentSaveId },
    include: {
      teams: {
        include: { players: true },
      },
      matches: true,
    },
  });
  if (!oldSave) {
    throw new Error(`SaveGame ${currentSaveId} not found`);
  }

  // 3. Create a fresh SaveGame record
  const newSave = await prisma.saveGame.create({
    data: { name, coachName },
  });

  // 4. Duplicate teams
  const teamIdMap = new Map<number, number>(); // oldTeam.id → newTeam.id
  for (const oldTeam of oldSave.teams) {
    const {
      baseTeamId,
      name: teamName,
      division,
      morale,
      currentSeason,
      localIndex,
    } = oldTeam;
    const newTeam = await prisma.saveGameTeam.create({
      data: {
      saveGameId: newSave.id,
      baseTeamId,
      name: teamName,
      division,           // must be a valid DivisionTier enum value
      morale,
      currentSeason,
      localIndex,         // 0-127 – **always** set
  },
});
    teamIdMap.set(oldTeam.id, newTeam.id);
  }

  // 5. Duplicate players
  for (const oldTeam of oldSave.teams) {
    const newTeamId = teamIdMap.get(oldTeam.id)!;
    for (const oldPlayer of oldTeam.players) {
      const {
        basePlayerId,
        name: playerName,
        position,
        rating,
        salary,
        behavior,
        contractUntil,
        localIndex,
      } = oldPlayer;
      await prisma.saveGamePlayer.create({
        data: {
          saveGameId: newSave.id,
          basePlayerId,
          name: playerName,
          position,
          rating,
          salary,
          behavior,
          contractUntil,
          localIndex,
          teamId: newTeamId,
        },
      });
    }
  }

  // 6. Duplicate matches
  for (const oldMatch of oldSave.matches) {
    const newHomeId = teamIdMap.get(oldMatch.homeTeamId)!;
    const newAwayId = teamIdMap.get(oldMatch.awayTeamId)!;
    await prisma.saveGameMatch.create({
      data: {
        saveGameId: newSave.id,
        homeTeamId: newHomeId,
        awayTeamId: newAwayId,
        homeGoals: oldMatch.homeGoals,
        awayGoals: oldMatch.awayGoals,
        matchDate: oldMatch.matchDate,
        played: oldMatch.played,
        matchdayId: oldMatch.matchdayId ?? undefined,
      },
    });
  }

  // 7. Return the new save ID
  return newSave.id;
}
