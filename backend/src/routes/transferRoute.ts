import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * List all transfers
 */
router.get('/', async (_req, res) => {
  try {
    const transfers = await prisma.transfer.findMany({
      include: {
        player: true,
        fromTeam: true,
        toTeam: true,
      },
      orderBy: { date: 'desc' },
    });
    res.json(transfers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

/**
 * Create a transfer
 */
router.post('/', async (req, res) => {
  const { playerId, fromTeamId, toTeamId, fee } = req.body;

  try {
    // check player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });
    if (!player) return res.status(404).json({ error: "Player not found" });

    // check destination team
    const toTeam = await prisma.team.findUnique({
      where: { id: toTeamId },
    });
    if (!toTeam) return res.status(404).json({ error: "Destination team not found" });

    // check budget
    if (toTeam.budget < fee) {
      return res.status(400).json({ error: "Not enough budget for transfer" });
    }

    // update budgets
    await prisma.team.update({
      where: { id: toTeamId },
      data: { budget: { decrement: fee } },
    });

    if (fromTeamId) {
      await prisma.team.update({
        where: { id: fromTeamId },
        data: { budget: { increment: fee } },
      });
    }

    // transfer player
    await prisma.player.update({
      where: { id: playerId },
      data: { teamId: toTeamId },
    });

    // record transfer
    const newTransfer = await prisma.transfer.create({
      data: {
        playerId,
        fromTeamId,
        toTeamId,
        fee,
      },
    });

    res.status(201).json(newTransfer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to execute transfer' });
  }
});

/**
 * Delete a transfer record (admin)
 */
router.delete('/:transferId', async (req, res) => {
  const transferId = parseInt(req.params.transferId);
  if (isNaN(transferId)) return res.status(400).json({ error: 'Invalid transfer id' });

  try {
    await prisma.transfer.delete({
      where: { id: transferId },
    });
    res.json({ message: 'Transfer deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transfer' });
  }
});

export default router;
