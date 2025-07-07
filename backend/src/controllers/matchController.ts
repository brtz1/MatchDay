import { Request, Response } from "express";
import { simulateMatch } from "../services/matchService";
import prisma from "../prisma/client";

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

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { homeTeamId, awayTeamId, matchdayId } = req.body;

    if (!homeTeamId || !awayTeamId || !matchdayId) {
      return res.status(400).json({ error: "homeTeamId, awayTeamId, and matchdayId are required." });
    }

    const match = await simulateMatch(homeTeamId, awayTeamId, matchdayId);

    res.status(201).json(match);
  } catch (error) {
    console.error("Error creating match", error);
    res.status(500).json({ error: "Failed to create match" });
  }
};
