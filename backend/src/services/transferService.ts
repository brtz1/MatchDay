// backend/src/services/transferService.ts

import prisma from '../utils/prisma';
import { Transfer } from '@prisma/client';

export async function transferPlayer(
  saveGameId: number,
  playerId: number,
  fromTeamId: number | null,
  toTeamId: number,
  fee: number
): Promise<Transfer> {
  return prisma.$transaction(async (tx) => {
    const player = await tx.saveGamePlayer.findFirst({
      where: {
        id: playerId,
        saveGameId,
      },
    });

    if (!player) {
      throw new Error(`Player not found in SaveGame (playerId: ${playerId}, saveGameId: ${saveGameId})`);
    }

    const destinationTeam = await tx.saveGameTeam.findFirst({
      where: {
        id: toTeamId,
        saveGameId,
      },
    });

    if (!destinationTeam) {
      throw new Error(`Destination team not found in SaveGame (teamId: ${toTeamId}, saveGameId: ${saveGameId})`);
    }

    if (fromTeamId) {
      const fromTeam = await tx.saveGameTeam.findFirst({
        where: {
          id: fromTeamId,
          saveGameId,
        },
      });

      if (!fromTeam) {
        throw new Error(`Origin team not found in SaveGame (teamId: ${fromTeamId}, saveGameId: ${saveGameId})`);
      }
    }

    await tx.saveGamePlayer.update({
      where: { id: playerId },
      data: { teamId: toTeamId },
    });

    const transfer = await tx.transfer.create({
      data: {
        saveGameId,   // ✅ now valid
        playerId,
        fromTeamId,
        toTeamId,
        fee,
      },
    });

    return transfer;
  });
}
