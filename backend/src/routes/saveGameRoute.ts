// backend/src/routes/saveGameRoute.ts

import express, { Request, Response } from "express";
import { MatchdayType, DivisionTier } from "@prisma/client";
import prisma from "../utils/prisma";
import { setCurrentSaveGame, setCoachTeam } from "../services/gameState";

const router = express.Router();

/* ------------------------------ Fixture Generators ------------------------------ */

export function generateLeagueFixtures(teams: any[], saveGameId: number) {
  if (teams.length !== 8) throw new Error("League fixture generator requires exactly 8 teams.");
  const fixtures = [];
  const matchups = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchups.push({ home: teams[i].id, away: teams[j].id });
      matchups.push({ home: teams[j].id, away: teams[i].id });
    }
  }

  for (let i = matchups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
  }

  for (let md = 1; md <= 14; md++) {
    for (let i = 0; i < 4; i++) {
      const match = matchups.pop();
      if (!match) break;
      fixtures.push({
        saveGameId,
        matchdayNumber: md,
        matchdayType: MatchdayType.LEAGUE,
        homeTeamId: match.home,
        awayTeamId: match.away,
      });
    }
  }

  return fixtures;
}

export function generateCupFixtures(teams: any[], saveGameId: number) {
  if (teams.length !== 128) throw new Error("Cup fixture generator requires exactly 128 teams.");
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const fixtures = [];
  let currentMatchday = 3;
  let currentTeams = shuffled;

  while (currentTeams.length >= 2) {
    const nextRoundTeams = [];

    for (let i = 0; i < currentTeams.length; i += 2) {
      const home = currentTeams[i];
      const away = currentTeams[i + 1];
      fixtures.push({
        saveGameId,
        matchdayNumber: currentMatchday,
        matchdayType: MatchdayType.CUP,
        homeTeamId: home.id,
        awayTeamId: away.id,
      });
      nextRoundTeams.push(home); // TEMP winner logic
    }

    currentMatchday += 3;
    currentTeams = nextRoundTeams;
  }

  return fixtures;
}

/* ------------------------------------ Routes ------------------------------------ */

// ✅ GET /api/save-game?includeTeams=true
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeTeams = req.query.includeTeams === "true";
    const games = await prisma.saveGame.findMany({
      include: includeTeams ? { teams: true } : undefined,
    });
    res.json(games);
  } catch (err) {
    console.error("Failed to fetch save games", err);
    res.status(500).json({ error: "Failed to fetch save games" });
  }
});

// ✅ POST /api/save-game — create new save game
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, coachName, countries } = req.body;

    const baseTeams = await prisma.baseTeam.findMany({
      where: { country: { in: countries } },
      include: { players: true },
    });

    const selected = baseTeams.slice(0, 128);

    const saveGame = await prisma.saveGame.create({
      data: {
        name,
        coachName,
        teams: {
          create: selected.map((team, index) => {
            const division =
              index < 8 ? DivisionTier.D1 :
              index < 16 ? DivisionTier.D2 :
              index < 24 ? DivisionTier.D3 :
              index < 32 ? DivisionTier.D4 :
              DivisionTier.DIST;

            const rating =
              division === DivisionTier.D1 ? Math.floor(Math.random() * 10) + 38 :
              division === DivisionTier.D2 ? Math.floor(Math.random() * 13) + 28 :
              division === DivisionTier.D3 ? Math.floor(Math.random() * 13) + 18 :
              division === DivisionTier.D4 ? Math.floor(Math.random() * 13) + 8 :
              Math.floor(Math.random() * 8) + 1;

            return {
              baseTeamId: team.id,
              name: team.name,
              morale: 50,
              division,
              currentSeason: 1,
              localIndex: index,
              rating,
            };
          }),
        },
      },
      include: { teams: true },
    });

    const teamMap = new Map<number, (typeof saveGame.teams)[number]>();
    for (const team of saveGame.teams) {
      if (typeof team.localIndex === "number") {
        teamMap.set(team.localIndex, team);
      }
    }

    const playersToCreate = selected.flatMap((baseTeam, teamIndex) => {
      const team = teamMap.get(teamIndex);
      if (!team) return [];

      return baseTeam.players
        .filter((p) => p.position !== "unknown")
        .map((basePlayer, playerIndex) => {
          const behavior = Math.floor(Math.random() * 5) + 1;
          const rating = Math.max(1, Math.min(99, team.rating + Math.floor(Math.random() * 5) - 2));
          const salary = rating * behavior * 10;

          return {
            saveGameId: saveGame.id,
            teamId: team.id,
            basePlayerId: basePlayer.id,
            name: basePlayer.name,
            nationality: basePlayer.nationality,
            position: basePlayer.position,
            rating,
            salary,
            behavior,
            contractUntil: 0,
            localIndex: playerIndex,
          };
        });
    });

    const validPlayers = playersToCreate.filter(
      (p) => ["GK", "DF", "MF", "AT"].includes(p.position)
    );

    const inserted = await prisma.saveGamePlayer.createMany({
      data: validPlayers,
      skipDuplicates: false,
    });

    console.log(`✅ Inserted ${inserted.count} players.`);

    const division4Teams = saveGame.teams.filter((t) => t.division === "D4");
    const coachTeam = division4Teams[Math.floor(Math.random() * division4Teams.length)];

    await setCurrentSaveGame(saveGame.id);
    await setCoachTeam(coachTeam.id);

    return res.status(201).json({
      userTeamId: coachTeam.id,
      userTeamName: coachTeam.name,
      saveGameId: saveGame.id,
      divisionPreview: (["D1", "D2", "D3", "D4"] as DivisionTier[]).map((tier) => {
        const teams = saveGame.teams.filter((t) => t.division === tier).map((t) => t.id).join(", ");
        return `${tier}: ${teams}`;
      }),
    });
  } catch (err) {
    console.error("❌ Failed to create save game", err);
    res.status(500).json({ error: "Failed to create save game" });
  }
});

// ✅ POST /api/save-game/load — load existing save by ID
router.post("/load", async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    const saveGame = await prisma.saveGame.findUnique({
      where: { id },
      include: {
        teams: true,
        players: true,
        matches: true,
      },
    });

    if (!saveGame) {
      return res.status(404).json({ error: "Save game not found" });
    }

    await setCurrentSaveGame(saveGame.id);

    const gameState = await prisma.gameState.findFirst({
      where: {
        currentSaveGameId: saveGame.id, // ✅ This matches your schema
      },
    });

    if (!gameState || !gameState.coachTeamId) {
      return res.status(400).json({ error: "No coach team assigned to this save game." });
    }

    res.json({
      coachTeamId: gameState.coachTeamId,
      saveGameId: saveGame.id,
    });
  } catch (err) {
    console.error("❌ Failed to load save game", err);
    res.status(500).json({ error: "Failed to load save game" });
  }
});

export default router;
