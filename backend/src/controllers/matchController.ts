// src/controllers/matchController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllMatches = async (req: Request, res: Response) => {
  try {
    const matches = await prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: true,
        events: true,
      },
    });
    res.json(matches);
  } catch (error) {
    console.error("Error fetching matches", error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
};
