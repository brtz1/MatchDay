// utils/player.ts

export const SALARY_MULTIPLIER = 1000;

/**
 * Generates a player rating based on their team's rating.
 * Applies +/- variance to ensure not all players are identical.
 */
export function generatePlayerRating(teamRating: number, index: number): number {
  const variance = Math.floor(Math.random() * 5);
  const sign = index % 2 === 0 ? 1 : -1;
  return Math.max(30, Math.min(99, teamRating + sign * variance));
}

/**
 * Calculates salary based on player rating and behavior.
 * Behavior affects the multiplier (Fair = cheaper, Unfair = more expensive).
 */
export function calculateSalary(rating: number, behavior: number): number {
  const multiplier = 1 + (behavior - 3) * 0.1;
  return Math.round(rating * SALARY_MULTIPLIER * multiplier);
}

/**
 * @deprecated
 * This function is deprecated.
 * Player "value" is no longer stored and is calculated dynamically during gameplay.
 */
export function calculateValue(rating: number): number {
  console.warn("calculateValue is deprecated and not used in this project.");
  return Math.round(rating * 5000);
}
