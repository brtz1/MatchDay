// src/routes/transferRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

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
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (player.teamId === null) return res.status(400).json({ error: 'Player is unattached' });

    // Optional Rule: prevent transfer if player is not transferable right now
    // Example rule: block if player was returned to team from failed auction
    // You can later implement: if (player.isLockedUntilMatchday > currentMatchday) return error

    const toTeam = await prisma.team.findUnique({
      where: { id: toTeamId },
    });

    if (!toTeam) return res.status(404).json({ error: 'Destination team not found' });

    // Perform transfer
    await prisma.player.update({
      where: { id: playerId },
      data: {
        teamId: toTeamId,
        contractUntil: 1, // Reset contract if needed — adjust as required
      },
    });

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
