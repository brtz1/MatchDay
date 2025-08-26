// backend/src/services/resultsService.ts
import prisma from "../utils/prisma";

/**
 * A compact per-team aggregate used for standings updates.
 */
export type TeamStandingDelta = {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type FinalizeSummary = {
  saveGameId: number;
  matchdayId: number;
  matchesFinalized: number;
  standingsPreview: TeamStandingDelta[]; // computed from all played matchdays
};

/**
 * Compute outcome deltas from a single finished match.
 */
function computeMatchDeltas(args: {
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number;
  awayGoals: number;
}): [TeamStandingDelta, TeamStandingDelta] {
  const { homeTeamId, awayTeamId, homeGoals, awayGoals } = args;

  let hWon = 0, hDraw = 0, hLost = 0, hPts = 0;
  let aWon = 0, aDraw = 0, aLost = 0, aPts = 0;

  if (homeGoals > awayGoals) { hWon = 1; aLost = 1; hPts = 3; }
  else if (homeGoals < awayGoals) { aWon = 1; hLost = 1; aPts = 3; }
  else { hDraw = 1; aDraw = 1; hPts = 1; aPts = 1; }

  const home: TeamStandingDelta = {
    teamId: homeTeamId,
    played: 1,
    won: hWon,
    drawn: hDraw,
    lost: hLost,
    goalsFor: homeGoals,
    goalsAgainst: awayGoals,
    points: hPts,
  };

  const away: TeamStandingDelta = {
    teamId: awayTeamId,
    played: 1,
    won: aWon,
    drawn: aDraw,
    lost: aLost,
    goalsFor: awayGoals,
    goalsAgainst: homeGoals,
    points: aPts,
  };

  return [home, away];
}

/**
 * Aggregate deltas from a list of matches.
 */
function accumulate(deltas: TeamStandingDelta[]): Map<number, TeamStandingDelta> {
  const map = new Map<number, TeamStandingDelta>();
  for (const d of deltas) {
    const cur = map.get(d.teamId) ?? {
      teamId: d.teamId,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0,
    };
    map.set(d.teamId, {
      teamId: d.teamId,
      played: cur.played + d.played,
      won: cur.won + d.won,
      drawn: cur.drawn + d.drawn,
      lost: cur.lost + d.lost,
      goalsFor: cur.goalsFor + d.goalsFor,
      goalsAgainst: cur.goalsAgainst + d.goalsAgainst,
      points: cur.points + d.points,
    });
  }
  return map;
}

/**
 * Recalculate the full standings table (preview) for a save by reading ALL
 * matches from matchdays that are already marked as played. This is safe and
 * deterministic, and avoids depending on any specific "standings" table schema.
 *
 * You can use the resulting array to populate a cache/table on your side.
 */
export async function recalcStandingsPreview(saveGameId: number): Promise<TeamStandingDelta[]> {
  // Get all finished matchdays for this save
  const matchdays = await prisma.matchday.findMany({
    where: { saveGameId, isPlayed: true },
    select: { id: true },
  });
  if (matchdays.length === 0) return [];

  const mdIds = matchdays.map((m) => m.id);

  // Pull all matches belonging to those matchdays
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId: { in: mdIds } },
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  const perMatch: TeamStandingDelta[] = [];
  for (const m of matches) {
    const [h, a] = computeMatchDeltas({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeGoals: m.homeGoals ?? 0,
      awayGoals: m.awayGoals ?? 0,
    });
    perMatch.push(h, a);
  }

  // Collapse to per-team totals
  const map = accumulate(perMatch);
  const list = Array.from(map.values());

  // Sort by points, GD, GF (typical tie-breakers; adjust to your rules)
  list.sort((A, B) => {
    if (B.points !== A.points) return B.points - A.points;
    const gdA = A.goalsFor - A.goalsAgainst;
    const gdB = B.goalsFor - B.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    if (B.goalsFor !== A.goalsFor) return B.goalsFor - A.goalsFor;
    return A.teamId - B.teamId;
  });

  return list;
}

/**
 * Mark the given matchday as played and return a deterministic standings preview
 * built from ALL played matchdays for this save. This "locks" current results
 * (via matchday.isPlayed = true). The actual scores are already persisted in
 * SaveGameMatch during live play; we don't mutate them here.
 *
 * If you maintain a concrete "standings" or "bracket" table, this is the ideal
 * place to write those updates (see the two TODO hooks below).
 */
export async function finalizeMatchday(saveGameId: number, matchdayId: number): Promise<FinalizeSummary> {
  // Defensive: ensure this matchday belongs to the save
  const md = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { id: true, saveGameId: true, isPlayed: true },
  });
  if (!md || md.saveGameId !== saveGameId) {
    throw new Error(`Matchday ${matchdayId} does not belong to save ${saveGameId}`);
  }

  // Lock the matchday so its results are considered immutable
  if (!md.isPlayed) {
    await prisma.matchday.update({
      where: { id: md.id },
      data: { isPlayed: true },
    });
  }

  // Count matches (for summary stats)
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId },
    select: { id: true },
  });

  // ── TODO (optional): Persist league standings (if you have a table for it) ──
  // const standings = await recalcStandingsPreview(saveGameId);
  // await persistStandingsToYourTable(saveGameId, standings); // <- implement to your schema

  // ── TODO (optional): Progress cup bracket (if this matchday is a cup round) ──
  // await progressCupBracketIfApplicable(saveGameId, matchdayId);

  // Return a safe preview that UI or another service can use
  const standingsPreview = await recalcStandingsPreview(saveGameId);

  return {
    saveGameId,
    matchdayId,
    matchesFinalized: matches.length,
    standingsPreview,
  };
}

/* ============================================================================
 * OPTIONAL PERSISTENCE HOOKS
 * ----------------------------------------------------------------------------
 * Below are examples showing how you might persist standings or progress a cup
 * bracket. They are intentionally commented because these table names/columns
 * vary across projects. Implement them to match YOUR Prisma schema, or keep
 * using the read-only `recalcStandingsPreview` in memory.
 * ========================================================================== */

/*
// Example: persist to a hypothetical LeagueStanding table
async function persistStandingsToYourTable(saveGameId: number, rows: TeamStandingDelta[]) {
  // Wipe & re-insert (simple approach). You might prefer UPSERTs instead.
  await prisma.leagueStanding.deleteMany({ where: { saveGameId } });
  await prisma.leagueStanding.createMany({
    data: rows.map(r => ({
      saveGameId,
      teamId: r.teamId,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      points: r.points,
    })),
  });
}

// Example: progress a cup bracket for this matchday (pair winners into next round)
async function progressCupBracketIfApplicable(saveGameId: number, matchdayId: number) {
  const md = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    select: { id: true, type: true },
  });
  if (!md || md.type !== "CUP") return;

  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId },
    select: { id: true, homeTeamId: true, awayTeamId: true, homeGoals: true, awayGoals: true },
  });

  // Determine winners (no extra-time/pen yet)
  const winners: number[] = [];
  for (const m of matches) {
    if ((m.homeGoals ?? 0) > (m.awayGoals ?? 0)) winners.push(m.homeTeamId);
    else if ((m.homeGoals ?? 0) < (m.awayGoals ?? 0)) winners.push(m.awayTeamId);
    else {
      // TODO: implement tie-breakers if needed
    }
  }

  // TODO: create next-round matchday & pair winners to generate next matches
  // await createNextRound(saveGameId, winners);
}
*/
