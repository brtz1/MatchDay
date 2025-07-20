import express, { Request, Response } from "express";
import prisma from "../utils/prisma";

const router = express.Router();

// 🔍 List all team IDs and names (temporary debug)
router.get("/debug-list", async (req: Request, res: Response) => {
  const teams = await prisma.saveGameTeam.findMany({
    select: { id: true, name: true },
  });
  res.json(teams);
});

// GET /api/save-game-teams/:id/players
router.get("/:id/players", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  try {
    const players = await prisma.saveGamePlayer.findMany({
      where: { teamId: id },
      orderBy: { localIndex: "asc" },
      select: {
        id: true,
        name: true,
        position: true,
        rating: true,
        salary: true,
        behavior: true,
        localIndex: true,
      },
    });

    res.json(players);
  } catch (err) {
    console.error("❌ Error fetching team players:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/test", (req: Request, res: Response) => {
  res.send("✅ save-game-teams route is working");
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  try {
    const team = await prisma.saveGameTeam.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: { localIndex: "asc" },
        },
        baseTeam: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const projectedPlayers = team.players.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      rating: p.rating,
      salary: p.salary,
      behavior: p.behavior,
      localIndex: p.localIndex ?? 0,
      // No nationality or isInjured in schema — omit them
    }));

    res.json({
      id: team.id,
      name: team.name,
      division: team.division,
      morale: team.morale,
      stadiumCapacity: 20000,
      colors: {
        primary: team.baseTeam?.primaryColor ?? "#000000",
        secondary: team.baseTeam?.secondaryColor ?? "#ffffff",
      },
      players: projectedPlayers,
    });
  } catch (err) {
    console.error("❌ Error fetching team:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

console.log("✅ Route /api/save-game-teams is mounted");

export default router;
