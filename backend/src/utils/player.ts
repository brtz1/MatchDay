// src/utils/player.ts

/**
 * Base multiplier for converting a rating into a salary figure.
 */
export const SALARY_MULTIPLIER = 1000;

/**
 * Generates a semi-random player rating around the team's rating.
 *
 * @param teamRating – the overall rating of the team
 * @param index – the player's index on the team (used to alternate variance direction)
 * @returns a rating between 30 and 99
 */
export function generatePlayerRating(teamRating: number, index: number): number {
  const variance = Math.floor(Math.random() * 5);       // 0–4
  const direction = index % 2 === 0 ? 1 : -1;           // alternate up/down
  const raw = teamRating + direction * variance;
  return Math.max(30, Math.min(99, raw));
}

/**
 * Calculates a player’s salary based on rating and behavior.
 * Higher behavior (good conduct) reduces multiplier cost; poor behavior increases it.
 *
 * @param rating – the player's rating (0–100)
 * @param behavior – the player's behavior score (1–5)
 * @returns the calculated salary (rounded to nearest integer)
 */
export function calculateSalary(rating: number, behavior: number): number {
  const behaviorAdjustment = 1 + (behavior - 3) * 0.1;  // behavior 3 → 1.0; 5 → 1.2; 1 → 0.8
  return Math.round(rating * SALARY_MULTIPLIER * behaviorAdjustment);
}

/**
 * @deprecated
 * Calculates an approximate market value for a player.
 * Not used in gameplay logic.
 *
 * @param rating – the player's rating
 * @returns the estimated value
 */
export function calculateValue(rating: number): number {
  console.warn('calculateValue is deprecated and not used in this project.');
  return Math.round(rating * 5000);
}
