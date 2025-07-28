import express, { Request, Response } from "express";
import prisma from "../utils/prisma";
import { setCurrentSaveGame, setCoachTeam } from "../services/gameState";
import { scheduleSeason } from "../services/seasonService";
import { syncPlayersWithNewTeamRating } from "../utils/playerSync";
import { DivisionTier } from "@prisma/client";

const router = express.Router();

/* ────────────────────────────────────────────────────────────────────────── */
/* GET /api/save-game?includeTeams=true                                      */
/* ────────────────────────────────────────────────────────────────────────── */
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeTeams = req.query.includeTeams === "true";
    const saves = await prisma.saveGame.findMany({
      include: includeTeams ? { teams: true } : undefined,
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
    const { name, coachName, countries } = req.body;

    // 1. Fetch and filter base teams
    const baseTeams = await prisma.baseTeam.findMany({
      where: { country: { in: countries } },
      include: { players: true },
    });

    if (baseTeams.length < 128) {
      return res.status(400).json({ error: "Need at least 128 clubs across chosen countries." });
    }

    const selected = baseTeams.slice(0, 128);

    // 2. Assign divisions and randomized ratings
    const divisionMap: Record<DivisionTier, typeof selected> = {
      D1: selected.slice(0, 8),
      D2: selected.slice(8, 16),
      D3: selected.slice(16, 24),
      D4: selected.slice(24, 32),
      DIST: selected.slice(32),
    };

    const saveGame = await prisma.saveGame.create({
      data: {
        name,
        coachName,
        teams: {
          create: selected.map((bt, idx) => {
            const division: DivisionTier =
              idx < 8 ? "D1" : idx < 16 ? "D2" : idx < 24 ? "D3" : idx < 32 ? "D4" : "DIST";

            // Randomized team rating per division
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
              localIndex: idx,
              rating,
            };
          }),
        },
      },
      include: { teams: true },
    });

    // 3. Generate players using playerSync.ts logic
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

    // Build map by division
    const divisionBaseMap: Record<DivisionTier, typeof baseTeams> = {
      D1: divisionMap.D1,
      D2: divisionMap.D2,
      D3: divisionMap.D3,
      D4: divisionMap.D4,
      DIST: divisionMap.DIST,
    };

    await syncPlayersWithNewTeamRating(liteTeams, divisionBaseMap);

    console.log(`✅ Inserted players for saveGame ${saveGame.id}`);

    // 4. Schedule league & cup season
    console.log(`🔨 Scheduling full season for saveGame ${saveGame.id}`);
    await scheduleSeason(saveGame.id, saveGame.teams);

    // 5. Randomly assign coach team from Division 4
    const d4 = saveGame.teams.filter((t) => t.division === "D4");
    const coach = d4[Math.floor(Math.random() * d4.length)];
    await setCurrentSaveGame(saveGame.id);
    await setCoachTeam(coach.id);

    // 6. Return response
    res.status(201).json({
      userTeamId: coach.id,
      userTeamName: coach.name,
      saveGameId: saveGame.id,
      divisionPreview: ["D1", "D2", "D3", "D4"].map((tier) =>
        `${tier}: ${saveGame.teams
          .filter((t) => t.division === tier)
          .map((t) => t.id)
          .join(", ")}`,
      ),
    });
  } catch (err) {
    console.error("❌ Failed to create save game", err);
    res.status(500).json({ error: "Failed to create save game" });
  }
});

/* ────────────────────────────────────────────────────────────────────────── */
/* POST /api/save-game/load — Load an existing save                          */
/* ────────────────────────────────────────────────────────────────────────── */
router.post("/load", async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    const saveGame = await prisma.saveGame.findUnique({ where: { id } });
    if (!saveGame) return res.status(404).json({ error: "Save game not found" });

    await setCurrentSaveGame(saveGame.id);

    const gs = await prisma.gameState.findFirst({ where: { currentSaveGameId: saveGame.id } });
    if (!gs?.coachTeamId) {
      return res.status(400).json({ error: "No coach team assigned to this save game." });
    }

    res.json({ coachTeamId: gs.coachTeamId, saveGameId: saveGame.id });
  } catch (err) {
    console.error("❌ Failed to load save game", err);
    res.status(500).json({ error: "Failed to load save game" });
  }
});

/* ────────────────────────────────────────────────────────────────────────── */

export default router;

/* ────────────────────────────────────────────────────────────────────────── */
/* Helper                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
