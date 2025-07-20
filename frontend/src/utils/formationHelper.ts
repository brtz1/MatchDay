/**
 * Maps common football formations to position counts.
 * Format: { GK: number, DF: number, MF: number, AT: number }
 */
export const FORMATION_LAYOUTS: Record<string, { GK: number; DF: number; MF: number; AT: number }> = {
  "4-4-2": { GK: 1, DF: 4, MF: 4, AT: 2 },
  "4-3-3": { GK: 1, DF: 4, MF: 3, AT: 3 },
  "4-5-1": { GK: 1, DF: 4, MF: 5, AT: 1 },
  "3-4-3": { GK: 1, DF: 3, MF: 4, AT: 3 },
  "3-3-4": { GK: 1, DF: 3, MF: 3, AT: 4 },
  "4-2-4": { GK: 1, DF: 4, MF: 2, AT: 4 },
  "5-3-2": { GK: 1, DF: 5, MF: 3, AT: 2 },
  "5-4-1": { GK: 1, DF: 5, MF: 4, AT: 1 },
  "5-2-3": { GK: 1, DF: 5, MF: 2, AT: 3 },
  "5-5-0": { GK: 1, DF: 5, MF: 5, AT: 0 },
  "6-3-1": { GK: 1, DF: 6, MF: 3, AT: 1 },
  "6-4-0": { GK: 1, DF: 6, MF: 4, AT: 0 },
};
