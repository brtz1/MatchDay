export function calculatePlayerPrice(rating: number, behavior: number): number {
  // Simple example: modify this as needed
  const base = rating * 10000;
  const behaviorPenalty = behavior * 2500; // Fair = 1, Unfair = 5
  return Math.max(base - behaviorPenalty, 5000); // Minimum price floor
}
