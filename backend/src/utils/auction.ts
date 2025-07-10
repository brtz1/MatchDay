// src/utils/auction.ts

import { Player, Team } from '@prisma/client';

export function runAuction(
  player: Player,
  teams: (Team & { coach?: { morale: number }, players: { rating: number }[] })[]
): number | null {
  const bids: { teamId: number; score: number }[] = [];

  for (const team of teams) {
    const avgRating =
      team.players.length > 0
        ? team.players.reduce((sum, saveGamePlayer) => sum + saveGamePlayer.rating, 0) / team.players.length
        : 50;

    const morale = team.coach?.morale ?? 50;
    const interestScore =
      avgRating +
      morale +
      (player.rating * 1.2) -
      (player.behavior * 5) + // less desirable if behavior is poor
      Math.random() * 30;

    if (interestScore > 120) {
      bids.push({ teamId: team.id, score: interestScore });
    }
  }

  if (bids.length === 0) return null;

  bids.sort((a, b) => b.score - a.score);
  return bids[0].teamId;
}
