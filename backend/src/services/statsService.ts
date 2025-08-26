// backend/src/services/statsService.ts

import prisma from "../utils/prisma";

/* ----------------------------------------------------------------------------
 * DTOs (save-game aware)
 * ---------------------------------------------------------------------------- */
export interface RecordSaveGamePlayerStatsDto {
  saveGamePlayerId: number;
  saveGameMatchId: number;
  goals?: number;
  assists?: number;
  yellow?: number;
  red?: number;
  injuries?: number;
}

/** Legacy shape (kept as a compatibility wrapper). */
export interface RecordPlayerStatsDto {
  playerId: number;   // maps to saveGamePlayerId
  matchId: number;    // maps to saveGameMatchId
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  injuries?: number;
}

/* ----------------------------------------------------------------------------
 * Row types
 * ---------------------------------------------------------------------------- */
export interface SaveGamePlayerMatchStat {
  id: number;
  saveGameMatchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  injuries: number;
}

/* ----------------------------------------------------------------------------
 * Create/Update (per-match upsert)
 * - If a row exists for (saveGamePlayerId, saveGameMatchId), increment fields.
 * - Else create with provided counts (defaulting to 0).
 * ---------------------------------------------------------------------------- */
export async function recordSaveGamePlayerStats(
  dto: RecordSaveGamePlayerStatsDto
): Promise<SaveGamePlayerMatchStat> {
  const {
    saveGamePlayerId,
    saveGameMatchId,
    goals = 0,
    assists = 0,
    yellow = 0,
    red = 0,
    injuries = 0,
  } = dto;

  // We assume a unique composite index exists:
  // @@unique([saveGamePlayerId, saveGameMatchId], name: "sgp_match_unique")
  const updated = await prisma.saveGamePlayerMatchStats.upsert({
    where: {
      saveGamePlayerId_saveGameMatchId: {
        saveGamePlayerId,
        saveGameMatchId,
      },
    },
    create: {
      saveGamePlayerId,
      saveGameMatchId,
      goals,
      assists,
      yellow,
      red,
      injuries,
    },
    update: {
      goals: { increment: goals },
      assists: { increment: assists },
      yellow: { increment: yellow },
      red: { increment: red },
      injuries: { increment: injuries },
    },
    select: {
      id: true,
      saveGameMatchId: true,
      goals: true,
      assists: true,
      yellow: true,
      red: true,
      injuries: true,
    },
  });

  return updated;
}

/* ----------------------------------------------------------------------------
 * Legacy wrapper (kept so older callers continue to work)
 * ---------------------------------------------------------------------------- */
export async function recordPlayerStats(dto: RecordPlayerStatsDto): Promise<SaveGamePlayerMatchStat> {
  return recordSaveGamePlayerStats({
    saveGamePlayerId: dto.playerId,
    saveGameMatchId: dto.matchId,
    goals: dto.goals ?? 0,
    assists: dto.assists ?? 0,
    yellow: dto.yellow ?? 0,
    red: dto.red ?? 0,
    injuries: dto.injuries ?? 0,
  });
}

/* ----------------------------------------------------------------------------
 * Per-player (in save) – list per-match rows
 * ---------------------------------------------------------------------------- */
export async function getSaveGamePlayerStats(
  saveGamePlayerId: number
): Promise<SaveGamePlayerMatchStat[]> {
  const rows = await prisma.saveGamePlayerMatchStats.findMany({
    where: { saveGamePlayerId },
    orderBy: { saveGameMatchId: "asc" },
    select: {
      id: true,
      saveGameMatchId: true,
      goals: true,
      assists: true,
      yellow: true,
      red: true,
      injuries: true,
    },
  });
  return rows;
}

/** Legacy wrapper name */
export async function getPlayerStats(
  saveGamePlayerId: number
): Promise<SaveGamePlayerMatchStat[]> {
  return getSaveGamePlayerStats(saveGamePlayerId);
}

/* ----------------------------------------------------------------------------
 * Aggregates for profile panels
 *  - Totals EVER across the whole save
 *  - "Goals this season" (and optionally other season-restricted totals)
 *
 *  We rely on relations:
 *    SaveGamePlayerMatchStats -> saveGameMatch -> matchday -> season
 * ---------------------------------------------------------------------------- */
export interface PlayerTotalsEver {
  games: number;     // appearances = number of match rows for this player
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  injuries: number;
}

export interface PlayerTotalsSeason extends PlayerTotalsEver {
  season: number;
}

export interface PlayerTotalsBundle {
  saveGamePlayerId: number;
  ever: PlayerTotalsEver;
  thisSeason?: PlayerTotalsSeason;
}

/**
 * Compute totals for a player across the whole save, and (optionally) for a given season.
 * If season is omitted, only `ever` is returned.
 */
export async function getPlayerTotals(
  saveGamePlayerId: number,
  season?: number
): Promise<PlayerTotalsBundle> {
  // All-time (EVER)
  const everRows = await prisma.saveGamePlayerMatchStats.findMany({
    where: { saveGamePlayerId },
    select: {
      goals: true,
      assists: true,
      yellow: true,
      red: true,
      injuries: true,
    },
  });

  const ever: PlayerTotalsEver = everRows.reduce<PlayerTotalsEver>(
    (acc, r) => {
      acc.games += 1;
      acc.goals += r.goals;
      acc.assists += r.assists;
      acc.yellow += r.yellow;
      acc.red += r.red;
      acc.injuries += r.injuries ?? 0;
      return acc;
    },
    { games: 0, goals: 0, assists: 0, yellow: 0, red: 0, injuries: 0 }
  );

  // Season-restricted (optional)
  let thisSeason: PlayerTotalsSeason | undefined = undefined;

  if (typeof season === "number") {
    const seasonRows = await prisma.saveGamePlayerMatchStats.findMany({
      where: {
        saveGamePlayerId,
        saveGameMatch: {
          matchday: { season }, // requires relation in schema
        },
      },
      select: {
        goals: true,
        assists: true,
        yellow: true,
        red: true,
        injuries: true,
      },
    });

    const agg = seasonRows.reduce<PlayerTotalsSeason>(
      (acc, r) => {
        acc.games += 1;
        acc.goals += r.goals;
        acc.assists += r.assists;
        acc.yellow += r.yellow;
        acc.red += r.red;
        acc.injuries += r.injuries ?? 0;
        return acc;
      },
      { season, games: 0, goals: 0, assists: 0, yellow: 0, red: 0, injuries: 0 }
    );

    thisSeason = agg;
  }

  return { saveGamePlayerId, ever, thisSeason };
}
