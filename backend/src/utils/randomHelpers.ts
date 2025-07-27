/**
 * randomHelpers.ts
 * ----------------
 * Utility functions for controlled randomness across the game.
 * Used for player ratings, salaries, behaviors, team assignments, etc.
 */

/**
 * Returns a random integer between min and max, inclusive.
 * @example randomInRange(1, 5) → 3
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns true with the given percentage chance (0–100).
 * @example chance(25) → true (25% of the time)
 */
export function chance(percent: number): boolean {
  return Math.random() < percent / 100;
}

/**
 * Shuffles an array in place.
 * @example shuffleArray([1, 2, 3]) → [2, 1, 3]
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInRange(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Picks a random element from an array.
 * @example pickRandom(["GK", "DF", "MF", "AT"]) → "MF"
 */
export function pickRandom<T>(arr: T[]): T {
  return arr[randomInRange(0, arr.length - 1)];
}
