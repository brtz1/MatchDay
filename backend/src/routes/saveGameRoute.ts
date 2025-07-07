import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * List existing save games
 */
router.get("/", async (req, res) => {
  try {
    const saves = await prisma.saveGame.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(saves);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load savegames" });
  }
});

/**
 * Start a new save game
 */
router.post("/", async (req, res) => {
  const { name, coachName, countries } = req.body;

  try {
    // pick base teams from chosen countries
    const baseTeams = await prisma.baseTeam.findMany({
      where: { country: { in: countries } },
      include: { players: true },
    });

    if (baseTeams.length < 128) {
      return res.status(400).json({ error: "Not enough teams in those countries" });
    }

    // order teams by rating
    const ordered = baseTeams.sort((a, b) => b.rating - a.rating);

    // assign divisions
    const divisions = ["D1","D2","D3","D4"];
    const divisionMap: Record<string, typeof ordered> = {
      D1: ordered.slice(0, 8),
      D2: ordered.slice(8, 16),
      D3: ordered.slice(16, 24),
      D4: ordered.slice(24, 32),
    };

    // pick random D4 team for user to coach
    const userTeam = divisionMap.D4[Math.floor(Math.random() * 8)];

    // create the savegame
    const saveGame = await prisma.saveGame.create({
      data: {
        name,
        coachName,
      }
    });

    // populate SaveGameTeam
    for (const [div, teams] of Object.entries(divisionMap)) {
      for (const team of teams) {
        await prisma.saveGameTeam.create({
          data: {
            saveGameId: saveGame.id,
            baseTeamId: team.id,
            name: team.name,
            budget: team.budget,
            division: div,
            coachName: team.coachName,
            morale: 50,
            currentSeason: 1,
          }
        });
      }
    }

    // populate SaveGamePlayer
    for (const team of ordered.slice(0,128)) {
      for (const p of team.players) {
        await prisma.saveGamePlayer.create({
          data: {
            saveGameId: saveGame.id,
            basePlayerId: p.id,
            name: p.name,
            position: p.position,
            rating: p.rating,
            salary: p.salary,
            teamId: team.id,
            contractUntil: 1,
          }
        });
      }
    }

    res.status(201).json({
      saveGameId: saveGame.id,
      userTeamId: userTeam.id,
      userTeamName: userTeam.name
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create new savegame" });
  }
});

/**
 * Load a save game
 */
router.get("/:id", async (req, res) => {
  const saveGameId = parseInt(req.params.id);
  if (isNaN(saveGameId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const save = await prisma.saveGame.findUnique({
      where: { id: saveGameId },
      include: {
        teams: true,
        players: true,
        matches: true
      }
    });
    res.json(save);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load savegame" });
  }
});

export default router;
