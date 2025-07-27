// backend/src/services/saveGameTeamService.ts

import prisma from "@/utils/prisma";

/**
 * Get full team data for the coach's team (with private players).
 */
export async function getCoachTeamById(saveGameId: number, teamId: number) {
  const team = await prisma.saveGameTeam.findFirst({
    where: { id: teamId, saveGameId },
    include: {
      players: true,
      baseTeam: true,
    },
  });

  if (!team) throw new Error("Coach team not found");

  return team;
}

/**
 * Get limited public info for an opponent team.
 */
export async function getOpponentTeamById(saveGameId: number, teamId: number) {
  const team = await prisma.saveGameTeam.findFirst({
    where: { id: teamId, saveGameId },
    include: {
      players: {
        select: {
          id: true,
          name: true,
          rating: true,
          position: true,
        },
      },
      baseTeam: true,
    },
  });

  if (!team) throw new Error("Opponent team not found");

  return team;
}

/**
 * List all SaveGameTeams for a save game (used for debug/dev).
 */
export async function listAllSaveGameTeams(saveGameId: number) {
  return await prisma.saveGameTeam.findMany({
    where: { saveGameId },
    include: {
      baseTeam: true,
    },
    orderBy: { localIndex: "asc" },
  });
}
