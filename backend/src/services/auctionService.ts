// src/services/auctionService.ts

import prisma from '../utils/prisma';

export interface AuctionResult {
  playerId: number;
  winnerTeamId: number;
  fee: number;
}

/**
 * runAuction
 *
 * When a player is put up for auction, all other teams in the same save game
 * bid once (fee = player.rating * 1000 to 2x that). The highest bid wins,
 * and the player’s teamId is updated accordingly.
 *
 * @param playerId – the ID of the SaveGamePlayer to auction
 * @returns details of the auction outcome
 * @throws if the player is not found or no eligible teams exist
 */
export async function runAuction(playerId: number): Promise<AuctionResult> {
  // 1. Load the player
  const player = await prisma.saveGamePlayer.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      saveGameId: true,
      teamId: true,
      rating: true,
      name: true,
    },
  });
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }
  if (player.teamId == null) {
    throw new Error(`Player ${playerId} is not currently assigned to a team`);
  }

  // 2. Find all other teams in the same save game
  const allTeams = await prisma.saveGameTeam.findMany({
    where: { saveGameId: player.saveGameId },
    select: { id: true },
  });
  const eligible = allTeams.filter((t) => t.id !== player.teamId);
  if (eligible.length === 0) {
    throw new Error(`No other teams in saveGame ${player.saveGameId} to bid`);
  }

  // 3. Each team bids: base = rating * 1000, variation up to base
  const base = player.rating * 1000;
  const bids = eligible.map((t) => ({
    teamId: t.id,
    fee: base + Math.floor(Math.random() * base),
  }));

  // 4. Determine highest bid
  bids.sort((a, b) => b.fee - a.fee);
  const winningBid = bids[0];

  // 5. Transfer the player to the winning team
  await prisma.saveGamePlayer.update({
    where: { id: playerId },
    data: { teamId: winningBid.teamId },
  });

  return {
    playerId,
    winnerTeamId: winningBid.teamId,
    fee: winningBid.fee,
  };
}
