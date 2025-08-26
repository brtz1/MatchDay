import express from "express";
import prisma from "../utils/prisma";

const router = express.Router();

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

  // Create with sane defaults for the opposite side
  return prisma.matchState.create({
    data: {
      saveGameMatchId: matchId,
      homeFormation: isHomeTeam ? formation : "4-4-2",
      awayFormation: isHomeTeam ? "4-4-2" : formation,
      homeLineup: isHomeTeam ? lineupIds : [],
      awayLineup: isHomeTeam ? [] : lineupIds,
      homeReserves: isHomeTeam ? reserveIds : [],
      awayReserves: isHomeTeam ? [] : reserveIds,
      homeSubsMade: 0,
      awaySubsMade: 0,
      subsRemainingHome: 3,
      subsRemainingAway: 3,
      isPaused: false,
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

    const val = await validateStartersExactly11AndOneGK(starters);
    if (!val.ok) return res.status(400).json({ error: val.error });

    // Resolve current matchday + coached team for this save
    const gs = await prisma.gameState.findFirst({
      where: { currentSaveGameId: sgId },
      select: { currentMatchday: true, coachTeamId: true },
    });
    if (!gs?.currentMatchday || !gs.coachTeamId) {
      return res.status(404).json({ error: "Active save must have currentMatchday and coachTeamId set" });
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

/**
 * Legacy endpoint
 * POST /api/matches/:matchId/formation
 * Body: { formation: string, isHomeTeam: boolean, lineupIds: number[], reserveIds?: number[] }
 *
 * NOTE: This version no longer accepts saveGameId; FE should provide isHomeTeam.
 */
router.post("/matches/:matchId/formation", async (req, res, next) => {
  try {
    const matchId = toNum(req.params.matchId);
    if (matchId == null) return res.status(400).json({ error: "Invalid matchId" });

    const { formation, isHomeTeam, lineupIds, reserveIds } = req.body as {
      formation?: string;
      isHomeTeam?: boolean;
      lineupIds?: number[];
      reserveIds?: number[];
    };

    if (typeof formation !== "string" || !formation.trim()) {
      return res.status(400).json({ error: "formation (string) is required" });
    }
    if (typeof isHomeTeam !== "boolean") {
      return res.status(400).json({ error: "isHomeTeam (boolean) is required" });
    }
    if (!Array.isArray(lineupIds)) {
      return res.status(400).json({ error: "lineupIds must be an array" });
    }

    const starters = uniq(lineupIds);
    const bench = uniq(Array.isArray(reserveIds) ? reserveIds : []).filter((id) => !starters.includes(id));

    const val = await validateStartersExactly11AndOneGK(starters);
    if (!val.ok) return res.status(400).json({ error: val.error });

    await upsertMatchStateSelection(matchId, isHomeTeam, formation.trim(), starters, bench);

    return res.json({
      ok: true,
      matchId,
      isHomeTeam,
      message: "Formation and selections recorded for match",
    });
  } catch (error) {
    console.error("❌ Error in POST /matches/:matchId/formation:", error);
    next(error);
  }
});

export default router;
