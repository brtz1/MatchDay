// src/services/transferService.ts

import prisma from '../utils/prisma';
import { Transfer } from '@prisma/client';

/**
 * Transfers a player between teams within a transaction.
 * Updates the player's assignment and logs a Transfer record.
 *
 * @param playerId – ID of the player being transferred.
 * @param fromTeamId – ID of the team the player is leaving (nullable).
 * @param toTeamId – ID of the destination team.
 * @param fee – Transfer fee amount.
 * @returns The created Transfer record.
 * @throws Error if the player or destination team is not found.
 */
export async function transferPlayer(
  playerId: number,
  fromTeamId: number | null,
  toTeamId: number,
  fee: number
): Promise<Transfer> {
  return prisma.$transaction(async (tx) => {
    // 1. Validate player existence
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new Error(`Player not found (ID: ${playerId})`);
    }

    // 2. Validate destination team existence
    const destinationTeam = await tx.team.findUnique({ where: { id: toTeamId } });
    if (!destinationTeam) {
      throw new Error(`Destination team not found (ID: ${toTeamId})`);
    }

    // 3. Update player's team assignment
    await tx.player.update({
      where: { id: playerId },
      data: { teamId: toTeamId },
    });

    // 4. Record the transfer
    const transfer = await tx.transfer.create({
      data: {
        playerId,
        fromTeamId,
        toTeamId,
        fee,
      },
    });

    return transfer;
  });
}
