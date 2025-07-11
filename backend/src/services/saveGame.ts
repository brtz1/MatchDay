// src/services/saveGame.ts

import prisma from '../utils/prisma';
import { DivisionTier, SaveGame } from '@prisma/client';

/**
 * Creates a new SaveGame snapshot from the static BaseTeam/BasePlayer data.
 * Divides teams into four divisions of 8 teams each (by descending rating),
 * then copies each team and its players into SaveGameTeam/SaveGamePlayer
 * with correct localIndex values (0–31 for teams, 0–19 for players).
 *
 * @param saveName – the name for the new save slot
 * @returns the created SaveGame record
 */
export async function createSaveGameFromBase(saveName: string): Promise<SaveGame> {
  // 1. Create the SaveGame record
  const save = await prisma.saveGame.create({
    data: { name: saveName },
  });

  // 2. Load all BaseTeams with their players, sorted by rating descending
  const baseTeams = await prisma.baseTeam.findMany({
    include: { players: true },
    orderBy: { rating: 'desc' },
  });

  // 3. Partition into four divisions of 8 teams each by rating
  const divisions: Record<DivisionTier, typeof baseTeams> = {
    D1: baseTeams.slice(0, 8),
    D2: baseTeams.slice(8, 16),
    D3: baseTeams.slice(16, 24),
    D4: baseTeams.slice(24, 32),
  };

  // 4. Create SaveGameTeam & SaveGamePlayer entries
  for (const [division, teams] of Object.entries(divisions) as [DivisionTier, typeof baseTeams][]) {
    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
      const base = teams[teamIndex];
      // SaveGameTeam
      const saveTeam = await prisma.saveGameTeam.create({
        data: {
          saveGameId: save.id,
          baseTeamId: base.id,
          name: base.name,
          division,
          morale: 75,
          currentSeason: 1,
          localIndex: teamIndex, // 0–7 within each division
        },
      });
      // SaveGamePlayer entries
      for (let playerIndex = 0; playerIndex < base.players.length; playerIndex++) {
        const player = base.players[playerIndex];
        await prisma.saveGamePlayer.create({
          data: {
            saveGameId: save.id,
            basePlayerId: player.id,
            name: player.name,
            position: player.position,
            rating: player.rating,
            salary: player.salary,
            behavior: player.behavior ?? 3,
            contractUntil: 1,
            teamId: saveTeam.id,
            localIndex: playerIndex, // 0–19 per team
          },
        });
      }
    }
  }

  return save;
}
