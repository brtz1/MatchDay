// backend/src/routes/saveGameTeamRoute.ts

import express, { Request, Response } from "express";
import prisma from "../utils/prisma";
import { getGameState } from "../services/gameState";

const router = express.Router();

/** 
 * GET /api/save-game-teams/
 * List all teams in the current save game (coachName only on coach team)
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(404).json({ error: "No active save game found" });
    }

    const [teams, save] = await Promise.all([
      prisma.saveGameTeam.findMany({
        where: { saveGameId: gameState.currentSaveGameId },
        select: {
          id: true,
          name: true,
          division: true,
          morale: true,
        },
      }),
      prisma.saveGame.findUnique({
        where: { id: gameState.currentSaveGameId },
        select: { coachName: true },
      }),
    ]);

    const enriched = teams.map((t) => ({
      ...t,
      coachName: t.id === gameState.coachTeamId ? save?.coachName ?? null : null,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("[saveGameTeamRoute] GET / error:", err);
    res.status(500).json({ error: "Failed to list teams" });
  }
});

// 🔍 Debug/legacy routes
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

// 📋 Public full team details (coachName included when applicable)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const teamId = Number(req.params.id);
    if (!Number.isFinite(teamId)) {
      return res.status(400).json({ error: "Invalid team id" });
    }

    const gameState = await getGameState();
    if (!gameState || !gameState.currentSaveGameId) {
      return res.status(404).json({ error: "No active save game found" });
    }

    const team = await prisma.saveGameTeam.findFirst({
      where: { id: teamId, saveGameId: gameState.currentSaveGameId },
      include: { players: true },
    });

    if (!team) return res.status(404).json({ error: "Team not found" });

    let coachName: string | null = null;
    if (team.id === gameState.coachTeamId) {
      const save = await prisma.saveGame.findUnique({
        where: { id: gameState.currentSaveGameId },
        select: { coachName: true },
      });
      coachName = save?.coachName ?? null;
    }

    res.json({ ...team, coachName });
  } catch (err) {
    console.error("[saveGameTeamRoute] GET /:id error:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

/**
 * 🏟️ Next match for a team, for the matchday that will be simulated NEXT.
 * Uses GameState.currentSaveGameId + currentMatchday + matchdayType as the authority.
 * Responds 200 with a flat MatchLite DTO or null.
 */
router.get("/:id/next-match", async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id, 10);
  if (isNaN(teamId)) return res.status(400).json({ error: "Invalid team ID" });

  try {
    const gs = await getGameState();
    if (!gs || !gs.currentSaveGameId || !gs.currentMatchday || !gs.matchdayType) {
      return res.json(null);
    }

    // Ensure the team belongs to this save
    const team = await prisma.saveGameTeam.findUnique({
      where: { id: teamId },
      select: { id: true, saveGameId: true },
    });
    if (!team || team.saveGameId !== gs.currentSaveGameId) {
      return res.json(null);
    }

    // Exact next simulated matchday (number + type)
    const md = await prisma.matchday.findFirst({
      where: {
        saveGameId: gs.currentSaveGameId,
        number: gs.currentMatchday,
        type: gs.matchdayType, // "LEAGUE" | "CUP"
      },
      select: { id: true, number: true, type: true },
    });
    if (!md) return res.json(null);

    // This team's match in that matchday
    const match = await prisma.saveGameMatch.findFirst({
      where: {
        matchdayId: md.id,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        matchDate: true, // adjust if your field differs
      },
      orderBy: { id: "asc" },
    });

    if (!match) return res.json(null);

    // Resolve names for both teams
    const teams = await prisma.saveGameTeam.findMany({
      where: { id: { in: [match.homeTeamId, match.awayTeamId] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(teams.map((t) => [t.id, t.name]));

    // Flat MatchLite DTO expected by the frontend
    res.json({
      id: match.id,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: nameById.get(match.homeTeamId) ?? `Team ${match.homeTeamId}`,
      awayTeamName: nameById.get(match.awayTeamId) ?? `Team ${match.awayTeamId}`,
      matchDate: match.matchDate ? new Date(match.matchDate).toISOString() : "",
      refereeName: null, // wire when you add referees
      matchdayNumber: md.number,
      matchdayType: md.type,
    });
  } catch (err) {
    console.error("❌ Error fetching next match:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🆚 Next opponent team details (same matchday selection as above)
router.get("/:id/opponent", async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id, 10);
  if (isNaN(teamId)) return res.status(400).json({ error: "Invalid team ID" });

  try {
    const gs = await getGameState();
    if (!gs || !gs.currentSaveGameId || !gs.currentMatchday || !gs.matchdayType) {
      return res.status(404).json({ error: "No active save game found" });
    }

    const md = await prisma.matchday.findFirst({
      where: {
        saveGameId: gs.currentSaveGameId,
        number: gs.currentMatchday,
        type: gs.matchdayType,
      },
      select: { id: true },
    });
    if (!md) return res.status(404).json({ error: "No upcoming opponent" });

    const match = await prisma.saveGameMatch.findFirst({
      where: {
        saveGameId: gs.currentSaveGameId,
        matchdayId: md.id,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      select: { homeTeamId: true, awayTeamId: true },
      orderBy: { id: "asc" },
    });
    if (!match) return res.status(404).json({ error: "No upcoming opponent" });

    const opponentId =
      match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;

    const opponent = await prisma.saveGameTeam.findUnique({
      where: { id: opponentId },
      include: { baseTeam: true },
    });
    if (!opponent) return res.status(404).json({ error: "Opponent not found" });

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
