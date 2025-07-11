// src/utils/teamRater.ts

/**
 * Returns a base team rating based on its division.
 * Division 1 teams are strongest, Division 4 weakest.
 *
 * @param division – numeric division (1–4)
 * @returns the base rating for teams in that division (30–99 scale)
 */
export function applyTeamRatingBasedOnDivision(division: number): number {
  switch (division) {
    case 1:
      return 95;
    case 2:
      return 85;
    case 3:
      return 75;
    case 4:
      return 65;
    default:
      return 50;
  }
}

/**
 * Generates an array of player ratings for a team.
 * Distributes ratings around the team’s base rating ±5 points.
 *
 * @param teamRating  – the base rating for the team
 * @param playerCount – the number of players on the team
 * @returns an array of length `playerCount` with each rating clamped to [30,99]
 */
export function generatePlayerRatingsForTeam(
  teamRating: number,
  playerCount: number
): number[] {
  const ratings: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    const variance = Math.floor(Math.random() * 11) - 5; // -5..+5
    ratings.push(clampRating(teamRating + variance));
  }
  return ratings;
}

function clampRating(rating: number): number {
  if (rating < 30) return 30;
  if (rating > 99) return 99;
  return rating;
}
