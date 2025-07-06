import prisma from '../utils/prisma';

export const transferPlayer = async (
  playerId: number,
  fromTeamId: number | null,
  toTeamId: number,
  fee: number
) => {
  return prisma.$transaction(async (tx) => {
    // check player
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player not found');

    // check toTeam
    const toTeam = await tx.team.findUnique({ where: { id: toTeamId } });
    if (!toTeam) throw new Error('Target team not found');

    if (toTeam.budget < fee) throw new Error('Not enough budget');

    // update player's team
    await tx.player.update({
      where: { id: playerId },
      data: { teamId: toTeamId }
    });

    // update team budgets
    if (fromTeamId) {
      await tx.team.update({
        where: { id: fromTeamId },
        data: { budget: { increment: fee } }
      });
    }

    await tx.team.update({
      where: { id: toTeamId },
      data: { budget: { decrement: fee } }
    });

    // create transfer record
    return tx.transfer.create({
      data: {
        playerId,
        fromTeamId,
        toTeamId,
        fee
      }
    });
  });
};