// backend/src/services/appearanceService.ts
import prisma from '../utils/prisma';

/**
 * Ensures one SaveGamePlayerMatchStats row per (match, player).
 * Safe to call multiple times thanks to skipDuplicates + unique index.
 */
export async function ensureAppearanceRows(
  saveGameMatchId: number,
  playerIds: number[]
) {
  if (!playerIds?.length) return;
  await prisma.saveGamePlayerMatchStats.createMany({
    data: playerIds.map((pid) => ({
      saveGameMatchId,
      saveGamePlayerId: pid,
    })),
    skipDuplicates: true,
  });
}
