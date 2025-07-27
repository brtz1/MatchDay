// src/services/createSaveGame.ts

import prisma from '../utils/prisma';
import { DivisionTier } from '@prisma/client';

/** Types */
type BaseTeam = {
  id: number;
  name: string;
  country: string;
  localIndex: number;
  division: DivisionTier;
  baseRating: number;
};

type BasePlayer = {
  id: number;
  name: string;
  position: string;
  behavior: number;
};

/**
 * Creates a new save game from a list of base teams and their players.
 * This function is used during new game creation, after team draw.
 */
export async function createSaveGame(
  name: string,
  coachName: string,
  selectedTeams: BaseTeam[],
  basePlayerMap: Map<number, BasePlayer[]>,
  coachLocalIndex: number
): Promise<number> {
  // 1. Create the new SaveGame
  const saveGame = await prisma.saveGame.create({
    data: { name, coachName },
  });

  const teamMap = new Map<number, Awaited<ReturnType<typeof prisma.saveGameTeam.create>>>(); // localIndex → SaveGameTeam

  // 2. Create teams
  for (const team of selectedTeams) {
    const rating = team.baseRating + Math.floor(Math.random() * 5); // randomize a bit
    const newTeam = await prisma.saveGameTeam.create({
      data: {
        saveGameId: saveGame.id,
        baseTeamId: team.id,
        name: team.name,
        division: team.division,
        morale: 50,
        currentSeason: 1,
        localIndex: team.localIndex,
        rating,
      },
    });
    teamMap.set(team.localIndex, newTeam);
  }

  // 3. Create players for each team
  for (const team of selectedTeams) {
    const players = basePlayerMap.get(team.id);
    const newTeam = teamMap.get(team.localIndex);
    if (!players || !newTeam) continue;

    const ratings = players.map(() => {
      const variance = Math.floor(Math.random() * 11) - 5;
      return clamp(newTeam.rating + variance);
    });

    await prisma.saveGamePlayer.createMany({
      data: players.map((p, i) => ({
        saveGameId: saveGame.id,
        basePlayerId: p.id,
        name: p.name,
        position: p.position,
        rating: ratings[i],
        salary: calculateSalary(ratings[i], p.behavior),
        behavior: p.behavior,
        contractUntil: 1,
        localIndex: i,
        teamId: newTeam.id,
      })),
    });
  }

  // 4. Set game state to point to this new save and coach team
  const coachTeam = teamMap.get(coachLocalIndex);
  if (!coachTeam) throw new Error('❌ Failed to identify coach team from localIndex');

  await prisma.gameState.updateMany({
    data: {
      currentSaveGameId: saveGame.id,
      coachTeamId: coachTeam.id,
      currentMatchday: 1,
      season: 1,
      gameStage: 'ACTION',
      matchdayType: 'LEAGUE',
    },
  });

  return saveGame.id;
}

function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  const behaviorFactor = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * behaviorFactor);
}

function clamp(value: number): number {
  return Math.max(1, Math.min(99, value));
}
