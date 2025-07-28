import prisma from "../utils/prisma";
import { DivisionTier } from "@prisma/client";

/* ──────────────────────────────── Types ──────────────────────────────── */
export type SaveGameTeamLite = {
  id: number;
  name: string;
  saveGameId: number;
  division: DivisionTier;
  localIndex: number;
  baseTeamId: number;
  morale: number;
  currentSeason: number;
  rating: number;
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

/* ──────────────────────────────── Main Function ──────────────────────────────── */
/**
 * Syncs all SaveGamePlayers based on each team's actual rating and base players.
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
      const team = saveGameTeams.find((t) => t.baseTeamId === baseTeam.id);
      if (!team) continue;

      const totalPlayers = baseTeam.players.length;
      const generatedRatings = generatePlayerRatings(team.rating, totalPlayers);

      const playersToCreate = baseTeam.players.map((p, index) => {
        const rating = generatedRatings[index];
        return {
          saveGameId: team.saveGameId,
          basePlayerId: p.id,
          name: p.name,
          position: p.position,
          rating,
          salary: calculateSalary(rating, p.behavior),
          behavior: p.behavior,
          contractUntil: 1,
          teamId: team.id,
          localIndex: index,
        };
      });

      // Optional: validation before write
      const valid = playersToCreate.filter(p => p.name && p.position);

      if (valid.length !== totalPlayers) {
        console.warn(`⚠️ Skipping ${totalPlayers - valid.length} invalid players from team ${team.name}`);
      }

      if (valid.length > 0) {
        await prisma.saveGamePlayer.createMany({ data: valid });
      }
    }
  }
}

/* ──────────────────────────────── Helpers ──────────────────────────────── */

function generatePlayerRatings(teamRating: number, count: number): number[] {
  const ratings: number[] = [];
  for (let i = 0; i < count; i++) {
    const variation = Math.floor(Math.random() * 11) - 5; // ±5
    ratings.push(clamp(teamRating + variation));
  }
  return ratings;
}

function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  const behaviorFactor =
    behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * behaviorFactor);
}

function clamp(value: number): number {
  return Math.max(1, Math.min(99, value));
}
