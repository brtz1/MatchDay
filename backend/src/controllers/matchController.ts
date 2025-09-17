// backend/src/controllers/matchController.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { MatchdayType } from "@prisma/client";

/**
 * Choose the best Matchday row if duplicates exist for (saveGameId, number).
 * Preference: CUP > most fixtures > newest id.
 */
function pickBestMatchday<T extends { id: number; type: MatchdayType; saveGameMatches: unknown[] }>(
  rows: T[],
): T {
  return [...rows].sort((a, b) => {
    const cupA = a.type === MatchdayType.CUP ? 1 : 0;
    const cupB = b.type === MatchdayType.CUP ? 1 : 0;
    if (cupA !== cupB) return cupB - cupA;
    const cntA = a.saveGameMatches.length;
    const cntB = b.saveGameMatches.length;
    if (cntA !== cntB) return cntB - cntA;
    return b.id - a.id; // newest
  })[0];
}

/**
 * Resolve the effective saveGameId and matchday number:
 * - If provided as query params, use them.
 * - Otherwise read from GameState (server-authoritative).
 */
async function resolveContext(req: Request): Promise<{
  saveGameId: number;
  matchdayNumber: number;
}> {
  const qSave = req.query.saveGameId != null ? Number(req.query.saveGameId) : undefined;
  const qMd = req.query.matchday != null ? Number(req.query.matchday) : undefined;

  if (Number.isFinite(qSave) && Number.isFinite(qMd)) {
    return { saveGameId: qSave!, matchdayNumber: qMd! };
  }

  const gs = await prisma.gameState.findFirst({
    select: { currentSaveGameId: true, currentMatchday: true },
    orderBy: { id: "desc" },
  });

  const saveGameId = Number.isFinite(qSave) ? (qSave as number) : (gs?.currentSaveGameId as number);
  const matchdayNumber = Number.isFinite(qMd) ? (qMd as number) : (gs?.currentMatchday as number);

  if (!saveGameId || !matchdayNumber) {
    throw new Error("Unable to resolve saveGameId/matchdayNumber");
  }
  return { saveGameId, matchdayNumber };
}

/**
 * Map a SaveGameMatch row to the FE's MatchDTO shape.
 * We expose a simple 'division' label; FE mostly uses it for grouping.
 */
function mapToMatchDTO(
  m: any,
  mdType: MatchdayType,
): {
  id: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  homeGoals: number;
  awayGoals: number;
  minute?: number;
  division: string;
} {
  return {
    id: m.id,
    homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name },
    awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name },
    homeGoals: m.homeGoals ?? 0,
    awayGoals: m.awayGoals ?? 0,
    // minute is driven live by sockets; initial can be 0/undefined
    minute: 0,
    division: mdType === "CUP" ? "Cup" : "League",
  };
}

/**
 * GET /api/matches
 * Returns matches for a given matchday (dup-safe), or the active one if not specified.
 * Accepts ?matchday=<number>&saveGameId=<id>
 */
export async function getAllMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { saveGameId, matchdayNumber } = await resolveContext(req);

    // Fetch ALL rows (defensive against duplicates), with their fixtures
    const mds = await prisma.matchday.findMany({
      where: { saveGameId, number: matchdayNumber },
      include: {
        saveGameMatches: {
          select: { id: true }, // only for counting in pickBestMatchday
        },
      },
      orderBy: { id: "desc" },
    });

    if (!mds.length) {
      res.status(404).json({ error: `Matchday not found for saveGameId=${saveGameId}, number=${matchdayNumber}` });
      return;
    }

    const md = pickBestMatchday(mds);

    // Now load the fixtures for the chosen Matchday
    const matches = await prisma.saveGameMatch.findMany({
      where: { matchdayId: md.id },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    const payload = matches.map((m) => mapToMatchDTO(m, md.type));
    res.status(200).json(payload);
  } catch (error) {
    console.error("❌ Error fetching matches:", error);
    next(error);
  }
}

/**
 * GET /api/matches/:id
 * Returns a single SaveGameMatch by ID with team relations.
 */
export async function getMatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const matchId = Number(req.params.id);
  if (!Number.isFinite(matchId)) {
    res.status(400).json({ error: "Invalid match id" });
    return;
  }

  try {
    const match = await prisma.saveGameMatch.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        matchday: { select: { type: true } },
      },
    });

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    const dto = mapToMatchDTO(match, match.matchday.type);
    res.status(200).json(dto);
  } catch (error) {
    console.error(`❌ Error fetching match ${matchId}:`, error);
    next(error);
  }
}
