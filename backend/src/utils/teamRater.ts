// src/utils/teamRater.ts

export function applyTeamRatingBasedOnDivision(division: number): number {
  // You can customize this logic to apply a bit of randomness too
  switch (division) {
    case 1: return 95;
    case 2: return 85;
    case 3: return 75;
    case 4: return 65;
    default: return 50;
  }
}

export function generatePlayerRatingsForTeam(
  teamRating: number,
  playerCount: number
): number[] {
  // Distribute ratings around teamRating ± 5 with small variance
  const ratings: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    const variance = Math.floor(Math.random() * 11) - 5; // -5 to +5
    ratings.push(clampRating(teamRating + variance));
  }
  return ratings;
}

function clampRating(rating: number): number {
  if (rating > 99) return 99;
  if (rating < 30) return 30;
  return rating;
}
