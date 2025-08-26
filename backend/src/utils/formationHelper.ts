/**
 * Position union used across helpers.
 */
export type Position = "GK" | "DF" | "MF" | "AT";

/**
 * Maps common football formations to position counts.
 * Format: { GK: number, DF: number, MF: number, AT: number }
 */
export const FORMATION_LAYOUTS: Record<
  string,
  { GK: number; DF: number; MF: number; AT: number }
> = {
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

/**
 * Strict UI sort: GK → DF → MF → AT, then rating desc.
 * Use this in roster tables and halftime popup lists.
 */
export const POSITION_ORDER: Record<Position, number> = {
  GK: 0,
  DF: 1,
  MF: 2,
  AT: 3,
};

export function sortPlayersByPosThenRating<T extends { position: Position; rating: number }>(
  players: T[]
): T[] {
  return [...players].sort((a, b) => {
    const byPos = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (byPos !== 0) return byPos;
    return b.rating - a.rating;
  });
}

/**
 * Given a pool of players and a formation string, selects the best
 * 11-player starting lineup and a bench of up to 5 players.
 *
 * Rules enforced:
 * - Starters must exactly match the formation: 1 GK + specified DF/MF/AT counts (total 11).
 * - If there aren't enough players to satisfy the formation, we throw an error (strict).
 * - Never allow 2 GKs in the starting lineup (all provided formations already specify GK:1).
 * - Bench size: up to 5, chosen from remaining players.
 * - Bench must include at least one of each position (GK/DF/MF/AT) IF available among remaining players.
 * - Selection priority is always highest rating within each position.
 */
export function generateLineup(
  players: {
    id: number;
    position: Position;
    rating: number;
  }[],
  formation: string
): { lineup: number[]; bench: number[] } {
  const layout = FORMATION_LAYOUTS[formation];
  if (!layout) throw new Error(`Unknown formation: ${formation}`);

  // Group by position
  const group: Record<Position, typeof players> = { GK: [], DF: [], MF: [], AT: [] };
  for (const p of players) group[p.position].push(p);

  // Sort each group by rating desc
  for (const pos of ["GK", "DF", "MF", "AT"] as const) {
    group[pos].sort((a, b) => b.rating - a.rating);
  }

  // Validate strict formation feasibility
  const missing: string[] = [];
  if (group.GK.length < layout.GK) missing.push(`GK (${layout.GK} needed, ${group.GK.length} available)`);
  if (group.DF.length < layout.DF) missing.push(`DF (${layout.DF} needed, ${group.DF.length} available)`);
  if (group.MF.length < layout.MF) missing.push(`MF (${layout.MF} needed, ${group.MF.length} available)`);
  if (group.AT.length < layout.AT) missing.push(`AT (${layout.AT} needed, ${group.AT.length} available)`);
  if (missing.length > 0) {
    throw new Error(
      `Cannot satisfy formation ${formation}. Insufficient players by position: ${missing.join(", ")}`
    );
  }

  // Build strict starting lineup (exactly follows formation)
  const lineupPlayers: typeof players = [
    ...group.GK.slice(0, layout.GK), // always 1 per map, ensures no 2 GKs
    ...group.DF.slice(0, layout.DF),
    ...group.MF.slice(0, layout.MF),
    ...group.AT.slice(0, layout.AT),
  ];

  // Safety: ensure 11 starters
  if (lineupPlayers.length !== 11) {
    throw new Error(
      `Invalid lineup size for formation ${formation}. Expected 11, got ${lineupPlayers.length}.`
    );
  }

  const lineupIds = new Set(lineupPlayers.map((p) => p.id));

  // Remaining pool for bench
  const remaining = players.filter((p) => !lineupIds.has(p.id));

  // Bench target: up to 5
  const BENCH_MAX = 5;

  // 1) Try to include at least one of each position IF available
  const benchPlayers: typeof players = [];
  for (const pos of ["GK", "DF", "MF", "AT"] as const) {
    const candidate = remaining.find((p) => p.position === pos);
    if (candidate) benchPlayers.push(candidate);
  }

  // 2) Fill remaining bench spots with highest-rated leftovers
  const usedIds = new Set([...lineupIds, ...benchPlayers.map((p) => p.id)]);
  const leftovers = remaining
    .filter((p) => !usedIds.has(p.id))
    .sort((a, b) => b.rating - a.rating);

  // Ensure we don't exceed BENCH_MAX
  while (benchPlayers.length < BENCH_MAX && leftovers.length > 0) {
    benchPlayers.push(leftovers.shift()!);
  }

  // Return only ids
  return {
    lineup: lineupPlayers.map((p) => p.id),
    bench: benchPlayers.map((p) => p.id),
  };
}
