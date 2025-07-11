// src/services/statsService.ts

import prisma from '../utils/prisma';
import { PlayerMatchStats } from '@prisma/client';

/**
 * Data required to record a player’s stats for a match.
 */
export interface RecordPlayerStatsDto {
  playerId: number;
  matchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

/**
 * Creates a new PlayerMatchStats record.
 *
 * @param dto – the stats to record
 * @returns the created PlayerMatchStats object
 */
export async function recordPlayerStats(
  dto: RecordPlayerStatsDto
): Promise<PlayerMatchStats> {
  return prisma.playerMatchStats.create({
    data: { ...dto },
  });
}

/**
 * Extended PlayerMatchStats with match metadata.
 */
export interface PlayerStatsDetail extends PlayerMatchStats {
  match: {
    id: number;
    matchDate: Date;
    matchdayId: number;
  };
}

/**
 * Fetches all stats entries for a given player, including match details.
 *
 * @param playerId – the ID of the player
 * @returns an array of PlayerStatsDetail ordered by match date
 */
export async function getPlayerStats(
  playerId: number
): Promise<PlayerStatsDetail[]> {
  return prisma.playerMatchStats.findMany({
    where: { playerId },
    include: {
      match: {
        select: {
          id: true,
          matchDate: true,
          matchdayId: true,
        },
      },
    },
    orderBy: {
      match: {
        matchDate: 'asc',
      },
    },
  }) as Promise<PlayerStatsDetail[]>;
}
