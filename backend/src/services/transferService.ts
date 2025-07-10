// src/services/transferService.ts
import prisma from '../utils/prisma';

export const transferPlayer = async (
  playerId: number,
  fromTeamId: number | null,
  toTeamId: number,
  fee: number
) => {
  return prisma.$transaction(async ($transaction) => {
    // Validate player
    const player = await $transaction.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    // Validate destination team
    const toTeam = await $transaction.team.findUnique({
      where: { id: toTeamId },
    });

    if (!toTeam) {
      throw new Error('Destination team not found');
    }

    // Optional: Prevent transfers for locked players (e.g. just returned from auction)
    // if (player.locked) {
    //   throw new Error('Player not eligible for transfer this matchday');
    // }

    // Update player's teamId
    await $transaction.player.update({
      where: { id: playerId },
      data: {
        teamId: toTeamId,
      },
    });

    // Record transfer in history
    const transfer = await $transaction.transfer.create({
      data: {
        playerId,
        fromTeamId,
        toTeamId,
        fee,
      },
    });

    return transfer;
  });
};
