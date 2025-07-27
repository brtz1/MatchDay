// src/utils/playerSync.ts

import prisma from "../utils/prisma";
import { DivisionTier } from "@prisma/client";

type SaveGameTeamLite = {
  id: number;
  name: string;
  saveGameId: number;
  division: DivisionTier;
  localIndex: number;
  baseTeamId: number;
  morale: number;
  currentSeason: number;
  rating: number; // 🆕 used instead of fixed per-division
};

type BaseTeamWithPlayers = {
  id: number;
  players: {
    id: number;
    name: string;
    position: string;
    behavior: number;
  }[];
};

/**
 * Creates SaveGamePlayers for each SaveGameTeam based on its actual rating.
 */
export async function syncPlayersWithNewTeamRating(
  saveGameTeams: SaveGameTeamLite[],
  divisionMap: Record<DivisionTier, BaseTeamWithPlayers[]>
): Promise<void> {
  for (const [divisionKey, baseTeams] of Object.entries(divisionMap) as [
    DivisionTier,
    BaseTeamWithPlayers[]
  ][]) {
    for (const baseTeam of baseTeams) {
      const saveTeam = saveGameTeams.find((t) => t.baseTeamId === baseTeam.id);
      if (!saveTeam) continue;

      const ratings = generatePlayerRatingsForTeam(saveTeam.rating, baseTeam.players.length);

      const playerData: {
        saveGameId: number;
        basePlayerId: number;
        name: string;
        position: string;
        rating: number;
        salary: number;
        behavior: number;
        contractUntil: number;
        teamId: number;
        localIndex: number;
      }[] = [];

      for (let i = 0; i < baseTeam.players.length; i++) {
        const p = baseTeam.players[i];
        if (!p.name || !p.position || typeof p.behavior !== "number") {
          console.error("❌ Invalid base player:", p);
          continue;
        }

        playerData.push({
          saveGameId: saveTeam.saveGameId,
          basePlayerId: p.id,
          name: p.name,
          position: p.position,
          rating: ratings[i],
          salary: calculateSalary(ratings[i], p.behavior),
          behavior: p.behavior,
          contractUntil: 1,
          teamId: saveTeam.id,
          localIndex: i,
        });
      }

      if (playerData.length > 0) {
        await prisma.saveGamePlayer.createMany({
          data: playerData,
        });
      }
    }
  }
}

function generatePlayerRatingsForTeam(teamRating: number, count: number): number[] {
  const ratings: number[] = [];
  for (let i = 0; i < count; i++) {
    const variance = Math.floor(Math.random() * 11) - 5; // ±5 variation
    ratings.push(clamp(teamRating + variance));
  }
  return ratings;
}

function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  const behaviorFactor = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * behaviorFactor);
}

function clamp(value: number): number {
  return Math.max(1, Math.min(99, value));
}
