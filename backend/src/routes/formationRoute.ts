// backend/src/routes/formationRoute.ts

import express from "express";
import prisma from "../utils/prisma";
import { ensureMatchState } from "../services/matchStateService";

const router = express.Router();

const BENCH_MAX = 6;

/* ------------------------------------------------------------- helpers */

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function validateStartersExactly11AndOneGK(playerIds: number[]) {
  const starters = await prisma.saveGamePlayer.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, position: true },
  });

  if (starters.length !== 11) {
    return { ok: false, error: "lineupIds must resolve to exactly 11 valid players" };
  }

  const gkCount = starters.filter((p) => String(p.position).toUpperCase() === "GK").length;
  if (gkCount !== 1) {
    return { ok: false, error: "Lineup must include exactly 1 GK" };
  }

  return { ok: true as const };
}

/**
 * Ensure every provided player id belongs to the COACH team in THIS save.
 * (Schema fields are `saveGameId` and `teamId`; there is no `saveGameTeamId`.)
 */
async function ensureAllPlayersBelongToCoachTeam(
  saveGameId: number,
  coachTeamId: number,
  allIds: number[]
) {
  // 1) Sanity: confirm the coach team belongs to this save
  const team = await prisma.saveGameTeam.findUnique({
    where: { id: coachTeamId },
    select: { id: true, saveGameId: true },
  });
  if (!team || team.saveGameId !== saveGameId) {
    return { ok: false as const, error: "Coach team does not belong to this save" };
  }

  if (allIds.length === 0) return { ok: true as const };

  // 2) Ensure all provided players belong to the coach team in this save
  const players = await prisma.saveGamePlayer.findMany({
    where: {
      id: { in: allIds },
      saveGameId,            // <-- correct field from schema
      teamId: coachTeamId,   // <-- correct field from schema (not saveGameTeamId)
    },
    select: { id: true },
  });

  if (players.length !== allIds.length) {
    return { ok: false as const, error: "One or more players do not belong to the coach team" };
  }
  return { ok: true as const };
}

async function upsertMatchStateSelection(
  matchId: number,
  isHomeTeam: boolean,
  formation: string,
  lineupIds: number[],
  reserveIds: number[]
) {
  const sideFormation = isHomeTeam ? "homeFormation" : "awayFormation";
  const sideLineup = isHomeTeam ? "homeLineup" : "awayLineup";
  const sideReserves = isHomeTeam ? "homeReserves" : "awayReserves";

  const existing = await prisma.matchState.findUnique({
    where: { saveGameMatchId: matchId },
  });

  if (existing) {
    return prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: {
        [sideFormation]: formation,
        [sideLineup]: lineupIds,
        [sideReserves]: reserveIds,
      },
    });
  }

  // No state yet: initialize both sides with best-available XI, then override the chosen side
  await ensureMatchState(matchId);
  return prisma.matchState.update({
    where: { saveGameMatchId: matchId },
    data: {
      [sideFormation]: formation,
      [sideLineup]: lineupIds,
      [sideReserves]: reserveIds,
    },
  });
}

/* ------------------------------------------------------------- routes */

/**
 * Preferred endpoint
 * POST /api/formation/coach
 * Body: { saveGameId: number, formation: string, lineupIds: number[], reserveIds?: number[] }
 *
 * Persists the coach team’s selection for the CURRENT matchday of the given save.
 * Validations:
 *  - lineupIds resolve to exactly 11 players with exactly 1 GK
 *  - reserveIds length <= BENCH_MAX (6)
 *  - all players belong to the coach team for this save
 */
router.post("/coach", async (req, res, next) => {
  try {
    const { saveGameId, formation, lineupIds, reserveIds } = req.body as {
      saveGameId?: number;
      formation?: string;
      lineupIds?: number[];
      reserveIds?: number[];
    };

    const sgId = toNum(saveGameId);
    if (sgId == null) return res.status(400).json({ error: "saveGameId (number) is required" });

    if (typeof formation !== "string" || !formation.trim()) {
      return res.status(400).json({ error: "formation (string) is required" });
    }
    if (!Array.isArray(lineupIds)) {
      return res.status(400).json({ error: "lineupIds must be an array" });
    }

    const starters = uniq(lineupIds);
    const bench = uniq(Array.isArray(reserveIds) ? reserveIds : []).filter((id) => !starters.includes(id));

    // Hard constraints: 11 starters with 1 GK
    const val = await validateStartersExactly11AndOneGK(starters);
    if (!val.ok) return res.status(400).json({ error: val.error });

    // Bench size constraint (server-side mirror of FE)
    if (bench.length > BENCH_MAX) {
      return res.status(400).json({ error: `reserveIds exceed max size (${bench.length}/${BENCH_MAX})` });
    }

    // Resolve current matchday + coached team for this save
    const gs = await prisma.gameState.findFirst({
      where: { currentSaveGameId: sgId },
      select: { currentMatchday: true, coachTeamId: true },
    });
    if (!gs?.currentMatchday || !gs.coachTeamId) {
      return res.status(404).json({ error: "Active save must have currentMatchday and coachTeamId set" });
    }

    // Ownership: all players must belong to this coach team IN this save
    const allIds = starters.concat(bench);
    const belong = await ensureAllPlayersBelongToCoachTeam(sgId, gs.coachTeamId, allIds);
    if (!belong.ok) {
      return res.status(400).json({ error: belong.error });
    }

    // Find the coach team’s match in this matchday
    const md = await prisma.matchday.findFirst({
      where: { saveGameId: sgId, number: gs.currentMatchday },
      include: {
        saveGameMatches: {
          select: { id: true, homeTeamId: true, awayTeamId: true },
        },
      },
    });
    if (!md) return res.status(404).json({ error: "Matchday not found for save" });

    const coachMatch = md.saveGameMatches.find(
      (m) => m.homeTeamId === gs.coachTeamId || m.awayTeamId === gs.coachTeamId
    );
    if (!coachMatch) return res.status(404).json({ error: "Coach team has no match in current matchday" });

    const isHomeTeam = coachMatch.homeTeamId === gs.coachTeamId;

    await upsertMatchStateSelection(coachMatch.id, isHomeTeam, formation.trim(), starters, bench);

    return res.json({
      ok: true,
      matchId: coachMatch.id,
      isHomeTeam,
      message: "Coach formation and selection saved",
    });
  } catch (error) {
    console.error("❌ Error in POST /formation/coach:", error);
    next(error);
  }
});

export default router;




