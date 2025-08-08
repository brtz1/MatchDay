// src/services/saveGame.ts

import prisma from "../utils/prisma";
import { DivisionTier, SaveGame } from "@prisma/client";

/**
 * Creates a new SaveGame snapshot from the static BaseTeam/BasePlayer data.
 * Divides teams into four divisions of 8 teams each (by descending rating),
 * then copies each team and its players into SaveGameTeam/SaveGamePlayer
 * with correct localIndex values (0–31 for teams, 0–19 for players).
 */
export async function createSaveGameFromBase(saveName: string): Promise<SaveGame> {
  return await prisma.$transaction(async (tx) => {
    // 1) Create the SaveGame record
    const save = await tx.saveGame.create({
      data: { name: saveName },
    });

    // 2) Load all BaseTeams with their players, sorted by rating desc
    const baseTeams = await tx.baseTeam.findMany({
      include: { players: true },
      orderBy: { rating: "desc" },
    });

    // 3) Partition into divisions
    const divisions: Record<DivisionTier, typeof baseTeams> = {
      D1: baseTeams.slice(0, 8),
      D2: baseTeams.slice(8, 16),
      D3: baseTeams.slice(16, 24),
      D4: baseTeams.slice(24, 32),
      DIST: [],
    };

    // 4) Create SaveGameTeam & SaveGamePlayer entries
    let teamLocalIndex = 0;
    for (const [division, teams] of Object.entries(
      divisions
    ) as [DivisionTier, typeof baseTeams][]) {
      for (const base of teams) {
        // create team
        const saveTeam = await tx.saveGameTeam.create({
          data: {
            saveGameId: save.id,
            baseTeamId: base.id,
            name: base.name,
            division,
            morale: 75,
            currentSeason: 1,
            localIndex: teamLocalIndex++,    // 0–31 across all teams
            rating: base.rating,             // carry over static rating
          },
        });

        // create players
        for (let playerIndex = 0; playerIndex < base.players.length; playerIndex++) {
          const p = base.players[playerIndex];
          await tx.saveGamePlayer.create({
            data: {
              saveGameId: save.id,
              basePlayerId: p.id,             // correct static ID
              name: p.name,
              position: p.position,
              rating: p.rating,
              salary: p.salary,
              behavior: p.behavior ?? 3,
              contractUntil: 1,
              teamId: saveTeam.id,
              localIndex: playerIndex,        // 0–19 within each team
            },
          });
        }
      }
    }

    return save;
  });
}
