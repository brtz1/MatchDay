import express from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = express.Router();

/* ------------------------------- helpers ------------------------------- */
const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

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

/* -------------------------------------------------------------------------- */
/* GET: Matches (optionally filter by matchday number)                         */
/*    Query:
 *      - matchday?: number   (filters by the matchday number within this save)
 * -------------------------------------------------------------------------- */
router.get('/', async (req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    // Parse matchday number safely
    let matchdayNum: number | undefined;
    if (typeof req.query.matchday === 'string' && req.query.matchday.trim() !== '') {
      const n = Number(req.query.matchday);
      if (Number.isFinite(n)) matchdayNum = n;
    }

    // If a matchday number was provided, resolve its id within this save
    let matchdayFilter: { matchdayId?: number } = {};
    if (typeof matchdayNum === 'number') {
      const md = await prisma.matchday.findFirst({
        where: { saveGameId, number: matchdayNum },
        select: { id: true },
      });
      if (!md) {
        // No such matchday for this save — return empty list
        return res.status(200).json([]);
      }
      matchdayFilter.matchdayId = md.id;
    }

    const matches = await prisma.saveGameMatch.findMany({
      where: {
        saveGameId,
        ...matchdayFilter,
      },
      include: {
        homeTeam: { select: { id: true, name: true, division: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: [{ id: 'asc' }],
    });

    // Shape to frontend DTO
    const result = matches.map((m) => ({
      id: m.id,
      homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name },
      awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name },
      homeGoals: m.homeGoals ?? 0,
      awayGoals: m.awayGoals ?? 0,
      division: m.homeTeam.division, // use home team tier for grouping
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error fetching matches:', error);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* POST: Legacy formation save (FE calls /api/matches/:id/formation)           */
/* Body: { formation: string, isHomeTeam: boolean, lineupIds: number[], reserveIds?: number[] }
 * -------------------------------------------------------------------------- */
router.post('/:id/formation', async (req, res, next) => {
  try {
    const matchId = toNum(req.params.id);
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
    console.error("❌ Error in POST /api/matches/:id/formation:", error);
    next(error);
  }
});

export default router;
