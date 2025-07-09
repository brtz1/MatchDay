// src/services/auctionService.ts

import prisma from '../utils/prisma';;
import { runAuction } from '../utils/auction';
import { Player } from '@prisma/client';

/**
 * Handles the full auction logic for a player:
 * - Gets eligible AI teams (not the current team)
 * - Calls auction runner
 * - Transfers player to winning team or locks him to original team
 */
export async function handleAuction(player: Player): Promise<number | null> {
  if (player.teamId == null) {
    throw new Error('Player teamId is null, cannot run auction.');
  }
  const eligibleTeams = await prisma.team.findMany({
    where: { id: { not: player.teamId } },
    include: {
      players: true,
      coach: true,
    },
  });

  if (eligibleTeams.length === 0) return null;

  const mappedTeams = eligibleTeams.map(team => ({
    id: team.id,
    name: team.name,
    country: team.country,
    divisionId: team.divisionId,
    stadiumSize: team.stadiumSize,
    ticketPrice: team.ticketPrice,
    rating: team.rating,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    coach: team.coach ? { morale: team.coach.morale } : undefined,
    players: team.players.map(p => ({ rating: p.rating })),
}));

  const winningTeamId = runAuction(player, mappedTeams);

  if (!winningTeamId) {
    // No one wants the player, he stays and is locked until next matchday
    await prisma.player.update({
      where: { id: player.id },
      data: {
        teamId: player.teamId, // Stays in current team
        contractUntil: player.contractUntil ?? 1, // Keep same value
      },
    });

    return null;
  }

  // Update player to winning team
  await prisma.player.update({
    where: { id: player.id },
    data: {
      teamId: winningTeamId,
      contractUntil: 1, // New contract
    },
  });

  // Log transfer
  await prisma.transfer.create({
    data: {
      playerId: player.id,
      fromTeamId: player.teamId,
      toTeamId: winningTeamId,
      fee: 0, // Fee not used
    },
  });

  return winningTeamId;
}
