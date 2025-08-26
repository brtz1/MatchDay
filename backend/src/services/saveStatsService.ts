// backend/src/services/saveStatsService.ts
import prisma from "../utils/prisma";

/** Ensure an "appearance" row exists for this player+match (0s everywhere). */
export async function ensureAppearance(saveGamePlayerId: number, saveGameMatchId: number) {
  await prisma.saveGamePlayerMatchStats.upsert({
    where: { saveGamePlayerId_saveGameMatchId: { saveGamePlayerId, saveGameMatchId } },
    update: {}, // already exists → nothing to change
    create: { saveGamePlayerId, saveGameMatchId },
  });
}

export async function recordGoal(saveGamePlayerId: number, saveGameMatchId: number) {
  await prisma.saveGamePlayerMatchStats.upsert({
    where: { saveGamePlayerId_saveGameMatchId: { saveGamePlayerId, saveGameMatchId } },
    update: { goals: { increment: 1 } },
    create: { saveGamePlayerId, saveGameMatchId, goals: 1 },
  });
}

export async function recordRedCard(saveGamePlayerId: number, saveGameMatchId: number) {
  await prisma.saveGamePlayerMatchStats.upsert({
    where: { saveGamePlayerId_saveGameMatchId: { saveGamePlayerId, saveGameMatchId } },
    update: { red: { increment: 1 } },
    create: { saveGamePlayerId, saveGameMatchId, red: 1 },
  });
}

export async function recordInjury(saveGamePlayerId: number, saveGameMatchId: number) {
  await prisma.saveGamePlayerMatchStats.upsert({
    where: { saveGamePlayerId_saveGameMatchId: { saveGamePlayerId, saveGameMatchId } },
    update: { injuries: { increment: 1 } },
    create: { saveGamePlayerId, saveGameMatchId, injuries: 1 },
  });
}

/** Summaries */
export type PlayerTotals = {
  gamesPlayed: number;
  goals: number;
  red: number;
  injuries: number;
};

export async function getCareerTotals(saveGamePlayerId: number): Promise<PlayerTotals> {
  const rows = await prisma.saveGamePlayerMatchStats.findMany({
    where: { saveGamePlayerId },
    select: { goals: true, red: true, injuries: true },
  });
  let goals = 0, red = 0, injuries = 0;
  for (const r of rows) {
    goals += r.goals;
    red += r.red;
    injuries += r.injuries;
  }
  return { gamesPlayed: rows.length, goals, red, injuries };
}

/** Use Matchday.season to filter for "this season". */
export async function getSeasonTotals(saveGamePlayerId: number, season: number): Promise<PlayerTotals> {
  const rows = await prisma.saveGamePlayerMatchStats.findMany({
    where: {
      saveGamePlayerId,
      saveGameMatch: {
        matchday: { season }, // ← relies on Matchday.season
      },
    },
    select: { goals: true, red: true, injuries: true },
  });
  let goals = 0, red = 0, injuries = 0;
  for (const r of rows) {
    goals += r.goals;
    red += r.red;
    injuries += r.injuries;
  }
  return { gamesPlayed: rows.length, goals, red, injuries };
}
