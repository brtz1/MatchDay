// backend/src/utils/auction.ts

export interface TeamAuctionEntry {
  id: number;
  name: string;
  coach: { morale: number };
  players: { id: number; rating: number }[];
}

export interface AuctionPlayer {
  id: number;
  rating: number;
  behavior: number;
  salary: number;
}

/**
 * Runs an auction for a single player among candidate teams.
 * Returns the winning teamId or null if no bids were high enough.
 */
export function runAuction(
  player: AuctionPlayer,
  teams: TeamAuctionEntry[]
): number | null {
  const bids: { teamId: number; score: number }[] = [];

  for (const team of teams) {
    const avgRating =
      team.players.length > 0
        ? team.players.reduce((sum, p) => sum + p.rating, 0) / team.players.length
        : 50;

    const interestScore =
      avgRating +
      team.coach.morale +
      player.rating * 1.2 -
      player.behavior * 5 +
      Math.random() * 30;

    if (interestScore > 120) {
      bids.push({ teamId: team.id, score: interestScore });
    }
  }

  if (bids.length === 0) return null;

  bids.sort((a, b) => b.score - a.score);
  return bids[0].teamId;
}
