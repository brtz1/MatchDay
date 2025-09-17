import express, { Request, Response } from "express";
import prisma from "../utils/prisma";
import { setCurrentSaveGame } from "../services/gameState";
import { scheduleSeason } from "../services/seasonService";
import { syncPlayersWithNewTeamRating } from "../utils/playerSync";
import { DivisionTier } from "@prisma/client";
import { generateInitialCupBracket } from "../services/cupBracketService";

const router = express.Router();

/* ────────────────────────────────────────────────────────────────────────── */
/* GET /api/save-game?includeTeams=true                                      */
/* ────────────────────────────────────────────────────────────────────────── */
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeTeams = req.query.includeTeams === "true";

    const saves = await prisma.saveGame.findMany({
      orderBy: { createdAt: "desc" },
      include: includeTeams
        ? {
            teams: {
              select: { id: true, name: true, division: true },
              orderBy: { id: "asc" },
            },
          }
        : undefined,
    });

    res.json(saves);
  } catch (err) {
    console.error("❌ Failed to fetch save games:", err);
    res.status(500).json({ error: "Failed to fetch save games" });
  }
});

/* ────────────────────────────────────────────────────────────────────────── */
/* POST /api/save-game — Create new save game                                */
/* ────────────────────────────────────────────────────────────────────────── */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, coachName, countries } = req.body as {
      name?: string;
      coachName: string;
      countries: string[];
    };

    const saveName = (name?.trim() || coachName?.trim() || "New Save");

    // 1) Fetch base teams (with players) from selected countries
    const baseTeams = await prisma.baseTeam.findMany({
      where: { country: { in: countries } },
      include: { players: true },
    });

    if (baseTeams.length < 128) {
      return res
        .status(400)
        .json({ error: "Need at least 128 clubs across chosen countries." });
    }

    // 2) Sort by original base rating (desc) and pick the first 128
    const ordered = [...baseTeams].sort((a, b) => b.rating - a.rating);
    const selected = ordered.slice(0, 128);

    // 3) Assign divisions by rank
    const divisionMap: Record<DivisionTier, typeof selected> = {
      D1: selected.slice(0, 8),
      D2: selected.slice(8, 16),
      D3: selected.slice(16, 24),
      D4: selected.slice(24, 32),
      DIST: selected.slice(32),
    };

    // 4) Create SaveGame + SaveGameTeams (with randomized ratings per division)
    const saveGame = await prisma.saveGame.create({
      data: {
        name: saveName,
        coachName,
        teams: {
          create: selected.map((bt, idx) => {
            const division: DivisionTier =
              idx < 8 ? "D1" : idx < 16 ? "D2" : idx < 24 ? "D3" : idx < 32 ? "D4" : "DIST";

            const rating =
              division === "D1"
                ? getRandomInt(38, 47)
                : division === "D2"
                ? getRandomInt(28, 40)
                : division === "D3"
                ? getRandomInt(18, 30)
                : division === "D4"
                ? getRandomInt(8, 20)
                : getRandomInt(1, 8);

            return {
              baseTeamId: bt.id,
              name: bt.name,
              division,
              morale: 50,
              currentSeason: 1,
              localIndex: idx, // 0..127
              rating,
            };
          }),
        },
      },
      include: { teams: true },
    });

    // 5) Build lite list for player sync
    const saveGameTeams = saveGame.teams;
    const liteTeams = saveGameTeams.map((t) => ({
      id: t.id,
      name: t.name,
      saveGameId: saveGame.id,
      division: t.division,
      localIndex: t.localIndex!,
      baseTeamId: t.baseTeamId,
      morale: t.morale,
      currentSeason: t.currentSeason,
      rating: t.rating,
    }));

    const divisionBaseMap: Record<DivisionTier, typeof baseTeams> = {
      D1: divisionMap.D1,
      D2: divisionMap.D2,
      D3: divisionMap.D3,
      D4: divisionMap.D4,
      DIST: divisionMap.DIST,
    };

    // 6) Generate players with ratings/salaries based on team rating/division
    await syncPlayersWithNewTeamRating(liteTeams, divisionBaseMap);
    console.log(`✅ Inserted players for saveGame ${saveGame.id}`);

    // 7) Generate the CUP Round of 128 bracket (idempotent)
    console.log(`🏆 Generating initial Cup bracket for saveGame ${saveGame.id}`);
    await generateInitialCupBracket(saveGame.id);

    // 8) Schedule LEAGUE season (fixtures, etc.)
    console.log(`🔨 Scheduling league season for saveGame ${saveGame.id}`);
    await scheduleSeason(saveGame.id, saveGame.teams);

    // 9) Randomly assign coach team from Division 4 (fallback: any team)
    const d4 = saveGame.teams.filter((t) => t.division === "D4");
    const pool = d4.length > 0 ? d4 : saveGame.teams;
    const coach = pool[Math.floor(Math.random() * pool.length)];

    // 10) Persist coachTeamId ON THE SAVE (so lists & loads are independent)
    await prisma.saveGame.update({
      where: { id: saveGame.id },
      data: { coachTeamId: coach.id },
    });

    // 11) Point GameState to THIS save with a clean baseline:
    //     currentMatchday = 1, stage = ACTION, type resolved from MD #1
    await setCurrentSaveGame(saveGame.id, {
      coachTeamId: coach.id,
      currentMatchday: 1,
      stage: "ACTION",
      // matchdayType will be resolved automatically by setCurrentSaveGame if omitted,
      // but we explicitly pass LEAGUE to be clear (MD#1 is league).
      matchdayType: "LEAGUE",
    });

    // 12) Respond
    res.status(201).json({
      userTeamId: coach.id,
      userTeamName: coach.name,
      saveGameId: saveGame.id,
      divisionPreview: (["D1", "D2", "D3", "D4"] as DivisionTier[]).map(
        (tier) =>
          `${tier}: ${saveGame.teams
            .filter((t) => t.division === tier)
            .map((t) => t.id)
            .join(", ")}`
      ),
    });
  } catch (err) {
    console.error("❌ Failed to create save game", err);
    res.status(500).json({ error: "Failed to create save game" });
  }
});

/* ────────────────────────────────────────────────────────────────────────── */
/* POST /api/save-game/load — Load an existing save                          */
/* Sets GameState to this save and restores correct matchday number.         */
/* ────────────────────────────────────────────────────────────────────────── */
router.post("/load", async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: number };

    const saveGame = await prisma.saveGame.findUnique({
      where: { id },
      select: { id: true, coachTeamId: true },
    });
    if (!saveGame) return res.status(404).json({ error: "Save game not found" });
    if (!saveGame.coachTeamId) {
      return res
        .status(400)
        .json({ error: "This save has no coach team assigned." });
    }

    // Determine the first unplayed matchday for this save (resume point)
    const nextMatchday = await resolveFirstUnplayedMatchday(id);

    await setCurrentSaveGame(id, {
      coachTeamId: saveGame.coachTeamId,
      currentMatchday: nextMatchday,
      stage: "ACTION",
      // Let setCurrentSaveGame resolve type from fixtures if you prefer:
      // matchdayType: undefined
    });

    res.json({ coachTeamId: saveGame.coachTeamId, saveGameId: id });
  } catch (err) {
    console.error("❌ Failed to load save game", err);
    res.status(500).json({ error: "Failed to load save game" });
  }
});

export default router;

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * First unplayed matchday for a given save.
 * If all days are played (or none exist), fall back to 1.
 */
async function resolveFirstUnplayedMatchday(saveGameId: number): Promise<number> {
  const md = await prisma.matchday.findFirst({
    where: {
      saveGameId,
      saveGameMatches: { some: { isPlayed: false } }, // <- FIXED names
    },
    orderBy: { number: "asc" },
    select: { number: true },
  });

  if (md?.number) return md.number;

  // If there are matchdays but all are played, just return 1 (your season reset logic will handle it)
  const anyDay = await prisma.matchday.findFirst({
    where: { saveGameId },
    select: { number: true },
  });
  return anyDay ? 1 : 1;
}
