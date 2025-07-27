import express, { Request, Response } from "express";
import prisma from "../utils/prisma";
import { getGameState } from "../services/gameState";

const router = express.Router();

// 🔍 List all team IDs and names (temporary debug)
router.get("/debug-list", async (_req: Request, res: Response) => {
  const teams = await prisma.saveGameTeam.findMany({
    select: { id: true, name: true },
  });
  res.json(teams);
});

// ✅ Test route
router.get("/test", (_req: Request, res: Response) => {
  res.send("✅ save-game-teams route is working");
});

// 📊 Finances by teamId (coach-only)
router.get("/:id/finances", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  const gameState = await getGameState();
  if (!gameState || gameState.coachTeamId !== id) {
    return res.status(403).json({ error: "You can only view your own team's finances" });
  }

  try {
    const players = await prisma.saveGamePlayer.findMany({
      where: { teamId: id },
      select: { salary: true },
    });

    const totalWage = players.reduce((sum, p) => sum + p.salary, 0);

    res.json({
      teamId: id,
      totalWage,
      weeklyBudget: Math.round(totalWage * 1.5), // Sample rule
    });
  } catch (err) {
    console.error("❌ Error fetching team finances:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 👥 Players by teamId (coach-only)
router.get("/:id/players", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid team ID" });

  const gameState = await getGameState();
  if (!gameState || gameState.coachTeamId !== id) {
    return res.status(403).json({ error: "You can only view your own team's players" });
  }

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

// 🔓 Public player list (no restrictions)
router.get("/:id/players/public", async (req: Request, res: Response) => {
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
    console.error("❌ Error fetching public team players:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📋 Public full team details (no permission check)
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
    }));

    res.json({
      id: team.id,
      name: team.name,
      division: team.division,
      morale: team.morale,
      stadiumCapacity: 20000, // Static for now
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

// 🏟️ Next unplayed match for a team
router.get("/:id/next-match", async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id, 10);
  if (isNaN(teamId)) return res.status(400).json({ error: "Invalid team ID" });

  try {
    const match = await prisma.saveGameMatch.findFirst({
      where: {
        played: false,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        matchday: { select: { number: true, type: true } },
      },
      orderBy: {
        matchday: { number: "asc" },
      },
    });

    if (!match) {
      return res.status(404).json({ error: "No upcoming matches" });
    }

    res.json({
      matchId: match.id,
      matchday: match.matchday,
      home: match.homeTeam.name,
      away: match.awayTeam.name,
    });
  } catch (err) {
    console.error("❌ Error fetching next match:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🆚 Next opponent team details
router.get("/:id/opponent", async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id, 10);
  if (isNaN(teamId)) return res.status(400).json({ error: "Invalid team ID" });

  try {
    const match = await prisma.saveGameMatch.findFirst({
      where: {
        played: false,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      orderBy: {
        matchday: { number: "asc" },
      },
    });

    if (!match) {
      return res.status(404).json({ error: "No upcoming opponent" });
    }

    const opponentId = match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;

    const opponent = await prisma.saveGameTeam.findUnique({
      where: { id: opponentId },
      include: {
        baseTeam: true,
      },
    });

    if (!opponent) {
      return res.status(404).json({ error: "Opponent not found" });
    }

    res.json({
      id: opponent.id,
      name: opponent.name,
      division: opponent.division,
      morale: opponent.morale,
      colors: {
        primary: opponent.baseTeam?.primaryColor ?? "#000000",
        secondary: opponent.baseTeam?.secondaryColor ?? "#ffffff",
      },
    });
  } catch (err) {
    console.error("❌ Error fetching opponent:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

console.log("✅ Route /api/save-game-teams is mounted");

export default router;
