import express, { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { applyTeamRatingBasedOnDivision } from "../utils/teamRater";
import { syncPlayersWithNewTeamRating } from "../utils/playerSync";
import { DivisionTier, GameStage, MatchdayType } from "@prisma/client";

const router = express.Router();

/* ------------------------------------------------------------------ GET /api/save-game (unchanged) */
router.get("/", async (req, res, next) => {
  try {
    const includeTeams = req.query.includeTeams === "true";
    const saves = await prisma.saveGame.findMany({
      orderBy: { createdAt: "desc" },
      include: includeTeams ? { teams: true } : undefined,
    });
    res.json(saves);
  } catch (err) {
    console.error("❌ Error fetching save games:", err);
    next(err);
  }
});

/* ------------------------------------------------------------------ POST /api/save-game */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, coachName, countries } = req.body as {
      name: string;
      coachName?: string;
      countries: string[];
    };
    if (!Array.isArray(countries) || countries.length === 0) {
      return res.status(400).json({ error: "countries must be a non-empty array" });
    }

    /* 1. Load base teams */
    const baseTeams = await prisma.baseTeam.findMany({
      where: { country: { in: countries } },
      include: { players: true },
    });
    if (baseTeams.length < 40) {
      return res
        .status(400)
        .json({ error: "Not enough teams in selected countries (min 40)" });
    }

    /* 2. Sort by rating */
    const ordered = [...baseTeams].sort((a, b) => b.rating - a.rating);

    /* 3. Partition: 32 visible, 96 hidden */
    const divisionMap: Record<DivisionTier, typeof ordered> = {
      D1: ordered.slice(0, 8),
      D2: ordered.slice(8, 16),
      D3: ordered.slice(16, 24),
      D4: ordered.slice(24, 32),
      DIST: ordered.slice(32, 128),
    };

    /* 4. Pick random user club from D4 */
    const userBase =
      divisionMap.D4[Math.floor(Math.random() * divisionMap.D4.length)];

    /* 5. Create SaveGame */
    const saveGame = await prisma.saveGame.create({ data: { name, coachName } });
    const saveGameTeamIds: Record<number, number> = {};

    /* 6. Insert all 128 SaveGameTeams/Players */
    let idx = 0;
    for (const [tier, teams] of Object.entries(
      divisionMap,
    ) as [DivisionTier, typeof ordered][]) {
      for (const team of teams) {
        const saveTeam = await prisma.saveGameTeam.create({
          data: {
            saveGameId: saveGame.id,
            baseTeamId: team.id,
            name: team.name,
            division: tier,
            morale: 75,
            currentSeason: 1,
            localIndex: idx++, // 0-127 unique
          },
        });
        saveGameTeamIds[team.id] = saveTeam.id;

        /* players */
        for (let j = 0; j < team.players.length; j++) {
          const p = team.players[j];
          await prisma.saveGamePlayer.create({
            data: {
              saveGameId: saveGame.id,
              basePlayerId: p.id,
              name: p.name,
              position: p.position,
              rating: p.rating,
              salary: p.salary,
              behavior: p.behavior,
              contractUntil: 1,
              teamId: saveTeam.id,
              localIndex: j,
            },
          });
        }
      }
    }

    /* 7. Ratings & sync */
    await applyTeamRatingBasedOnDivision(saveGame.id);
    await syncPlayersWithNewTeamRating(saveGame.id, baseTeams, divisionMap);

    /* 8. Init GameState */
    const coachTeamId = saveGameTeamIds[userBase.id];
    await prisma.gameState.upsert({
  where: { id: 1 },                // always row 1
  update: {
    currentSaveGameId: saveGame.id,
    coachTeamId,
    currentMatchday: 1,
    matchdayType: MatchdayType.LEAGUE,
    gameStage: GameStage.ACTION,
    season: 1,
  },
  create: {
    id: 1,
    season: 1,
    currentSaveGameId: saveGame.id,
    coachTeamId,
    currentMatchday: 1,
    matchdayType: MatchdayType.LEAGUE,
    gameStage: GameStage.ACTION,
  },
});

    /* 9. Visible division preview */
    const divisionPreview = (["D1", "D2", "D3", "D4"] as DivisionTier[]).map(
      (tier) => `${tier}: ${divisionMap[tier].map((t) => saveGameTeamIds[t.id]).join(", ")}`,
    );

    res.status(201).json({
      saveGameId: saveGame.id,
      userTeamId: coachTeamId,
      userTeamName: userBase.name,
      divisionPreview,
    });
  } catch (err) {
    console.error("❌ Error creating save game:", err);
    next(err);
  }
});

/* ------------------------------------------------------------------ POST /api/save-game/load */
router.post("/load", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing save game ID" });

    // Fetch the SaveGame with associated teams
    const saveGame = await prisma.saveGame.findUnique({
      where: { id },
      include: {
        teams: {
          where: { division: "D4" }, // D4 assumed to contain the coach team
          orderBy: { localIndex: "asc" }, // fallback order
        },
      },
    });

    if (!saveGame || saveGame.teams.length === 0) {
      return res.status(404).json({ error: "Save game not found or has no D4 teams" });
    }

    const coachTeam = saveGame.teams[0]; // pick first D4 team
    const coachTeamId = coachTeam.id;

    await prisma.gameState.upsert({
      where: { id: 1 }, // always the same row
      update: {
        currentSaveGameId: id,
        coachTeamId,
        currentMatchday: 1,
        matchdayType: MatchdayType.LEAGUE,
        gameStage: GameStage.ACTION,
        season: 1,
      },
      create: {
        id: 1,
        currentSaveGameId: id,
        coachTeamId,
        currentMatchday: 1,
        matchdayType: MatchdayType.LEAGUE,
        gameStage: GameStage.ACTION,
        season: 1,
      },
    });

    res.json({ coachTeamId });
  } catch (err) {
    console.error("❌ Error loading save game:", err);
    next(err);
  }
});

export default router;
