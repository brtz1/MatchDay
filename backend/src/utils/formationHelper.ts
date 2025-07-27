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
 * Given a pool of players and a formation string, selects the best
 * 11-player starting lineup and 8-player bench.
 */
export function generateLineup(
  players: {
    id: number;
    position: "GK" | "DF" | "MF" | "AT";
    rating: number;
  }[],
  formation: string
): { lineup: number[]; bench: number[] } {
  const layout = FORMATION_LAYOUTS[formation];
  if (!layout) throw new Error(`Unknown formation: ${formation}`);

  const group: Record<"GK" | "DF" | "MF" | "AT", typeof players> = {
    GK: [],
    DF: [],
    MF: [],
    AT: [],
  };

  for (const player of players) {
    group[player.position].push(player);
  }

  // Sort each group by descending rating
  for (const pos of ["GK", "DF", "MF", "AT"] as const) {
    group[pos].sort((a, b) => b.rating - a.rating);
  }

  // Build starting lineup
  const lineup: typeof players = [
    ...group.GK.slice(0, layout.GK),
    ...group.DF.slice(0, layout.DF),
    ...group.MF.slice(0, layout.MF),
    ...group.AT.slice(0, layout.AT),
  ];

  const lineupIds = new Set(lineup.map((p) => p.id));

  // Build bench: start with 1 per role
  const bench: typeof players = [];

  const addBench = (
    pos: "GK" | "DF" | "MF" | "AT",
    count: number = 1
  ) => {
    const pool = group[pos].filter((p) => !lineupIds.has(p.id));
    bench.push(...pool.slice(0, count));
  };

  addBench("GK", 1);
  addBench("DF", 1);
  addBench("MF", 1);
  addBench("AT", 1);

  // Fill remaining spots with highest-rated remaining players
  const alreadyUsed = new Set([...lineupIds, ...bench.map((p) => p.id)]);
  const leftovers = players
    .filter((p) => !alreadyUsed.has(p.id))
    .sort((a, b) => b.rating - a.rating);

  bench.push(...leftovers.slice(0, 8 - bench.length));

  return {
    lineup: lineup.map((p) => p.id),
    bench: bench.map((p) => p.id),
  };
}
