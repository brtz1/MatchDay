// backend/src/controllers/playerController.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/players
 * Returns all players with optional filters (teamId, position, nationality).
 */
export async function getAllPlayers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { teamId, position, nationality } = req.query;

    const where: Prisma.PlayerWhereInput = {};
    if (teamId != null) {
      const parsed = Number(teamId);
      if (!Number.isFinite(parsed)) {
        res.status(400).json({ error: "teamId must be a number" });
        return;
      }
      where.teamId = parsed;
    }
    if (position != null) where.position = String(position);
    if (nationality != null) where.nationality = String(nationality);

    const players = await prisma.player.findMany({
      where,
      include: {
        team: true,
        // ❌ events: true,  // removed — no longer exists on Player
      },
    });

    res.status(200).json(players);
  } catch (error) {
    console.error("❌ Error fetching players:", error);
    next(error);
  }
}

/**
 * GET /api/players/:id
 * Returns a single player by ID with team and matchStats.
 */
export async function getPlayerById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const playerId = Number(req.params.id);
  if (!Number.isFinite(playerId)) {
    res.status(400).json({ error: "Invalid player id" });
    return;
  }
  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: true,
        matchStats: true,
        // ❌ events: true,  // removed — no longer exists on Player
      },
    });

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    res.status(200).json(player);
  } catch (error) {
    console.error(`❌ Error fetching player ${playerId}:`, error);
    next(error);
  }
}
