// src/services/statsService.ts

import prisma from "../utils/prisma";

// DTOs
export interface RecordPlayerStatsDto {
  playerId: number;
  matchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  injuries?: number;
}

// Aggregated per-match stats for one player (used by GET /api/stats/:playerId)
export interface PlayerStat {
  id: number;
  matchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  injuries?: number;
}

/**
 * Record (create) player stats for a match.
 */
export async function recordPlayerStats(dto: RecordPlayerStatsDto): Promise<PlayerStat> {
  // Accept injuries as optional, default to 0
  const { playerId, matchId, goals, assists, yellow, red, injuries = 0 } = dto;
  const stat = await prisma.playerMatchStats.create({
    data: {
      playerId,
      matchId,
      goals,
      assists,
      yellow,
      red,
      injuries,
    },
    select: {
      id: true,
      matchId: true,
      goals: true,
      assists: true,
      yellow: true,
      red: true,
      injuries: true,
    },
  });
  return stat;
}

/**
 * Get all match stats for a player (used by GET /api/stats/:playerId)
 */
export async function getPlayerStats(playerId: number): Promise<PlayerStat[]> {
  const stats = await prisma.playerMatchStats.findMany({
    where: { playerId },
    orderBy: { matchId: "asc" },
    select: {
      id: true,
      matchId: true,
      goals: true,
      assists: true,
      yellow: true,
      red: true,
      injuries: true,
    },
  });
  return stats;
}

