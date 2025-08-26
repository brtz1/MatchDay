// backend/src/routes/matchStateRoute.ts

import express, { Request, Response, NextFunction } from "express";
import { MatchEventType } from "@prisma/client";
import prisma from "../utils/prisma";
// If your functions live in matchService.ts, change the path accordingly.
import {
  ensureInitialMatchState,
  getMatchStateById,
  applySubstitution,
} from "../services/matchService";

const router = express.Router();

type Side = "home" | "away";
type Position = "GK" | "DF" | "MF" | "AT";

type PlayerUI = {
  id: number;
  name: string;
  position: Position;
  rating: number;
  isInjured: boolean;
};

type PublicSideState = {
  side: Side;
  subsRemaining: number;
  lineup: PlayerUI[];
  bench: PlayerUI[];
};

/* --------------------------- helpers & normalization --------------------------- */

function normalizePos(p?: string | null): Position {
  const s = (p ?? "").toUpperCase();
  if (s === "GK" || s === "G" || s === "GOALKEEPER") return "GK";
  if (s === "DF" || s === "D" || s === "DEF" || s === "DEFENDER") return "DF";
  if (s === "MF" || s === "M" || s === "MID" || s === "MIDFIELDER") return "MF";
  if (s === "AT" || s === "F" || s === "FW" || s === "ATT" || s === "ATTACKER" || s === "ST")
    return "AT";
  return "MF";
}

const POSITION_ORDER: Record<Position, number> = { GK: 0, DF: 1, MF: 2, AT: 3 };

function sortPlayersForUI<T extends { position: Position; rating: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const byPos = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (byPos !== 0) return byPos;
    return b.rating - a.rating;
  });
}

async function resolveSide(req: Request, matchHomeId: number, matchAwayId: number): Promise<Side> {
  const sideParam = String(req.query.side ?? "").toLowerCase();
  const teamIdParam =
    req.query.teamId != null && String(req.query.teamId).trim() !== ""
      ? Number(req.query.teamId)
      : undefined;

  if (sideParam === "home") return "home";
  if (sideParam === "away") return "away";

  if (typeof teamIdParam === "number" && !Number.isNaN(teamIdParam)) {
    if (teamIdParam === matchHomeId) return "home";
    if (teamIdParam === matchAwayId) return "away";
  }

  const gs = await getGameStateSafe();
  if (gs?.coachTeamId === matchHomeId) return "home";
  if (gs?.coachTeamId === matchAwayId) return "away";

  return "home";
}

async function getGameStateSafe() {
  try {
    const mod = await import("../services/gameState");
    return mod.getGameState();
  } catch {
    return null;
  }
}

/**
 * Build a hydrated, UI-ready state for one side.
 * - Keeps injured players ON the field; just flags `isInjured=true`.
 * - Sorts players GK → DF → MF → AT, then by rating desc.
 */
async function buildPublicSideState(matchId: number, side: Side): Promise<PublicSideState> {
  const ms = await getMatchStateById(matchId);
  if (!ms) throw new Error(`MatchState for match ${matchId} not found`);

  const lineupIds: number[] = (side === "home" ? ms.homeLineup : ms.awayLineup) ?? [];
  const benchIds: number[] = (side === "home" ? ms.homeReserves : ms.awayReserves) ?? [];
  const subsMade: number = side === "home" ? (ms.homeSubsMade ?? 0) : (ms.awaySubsMade ?? 0);

  const ids = [...lineupIds, ...benchIds];
  const players = ids.length
    ? await prisma.saveGamePlayer.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, position: true, rating: true },
      })
    : [];

  const byId = new Map(players.map((p) => [p.id, p]));

  // Injuries are tracked via MatchEvent (enum INJURY); players remain on the field until subbed.
  const injuryEvents = await prisma.matchEvent.findMany({
    where: {
      saveGameMatchId: matchId,
      type: MatchEventType.INJURY,
      saveGamePlayerId: { not: null },
    },
    select: { saveGamePlayerId: true },
  });
  const injured = new Set<number>(injuryEvents.map((e) => e.saveGamePlayerId!));

  const lineup: PlayerUI[] = lineupIds
    .map((id: number) => {
      const p = byId.get(id);
      if (!p) return undefined;
      return {
        id: p.id,
        name: p.name,
        position: normalizePos(p.position),
        rating: p.rating ?? 0,
        isInjured: injured.has(p.id),
      } as PlayerUI;
    })
    .filter(Boolean) as PlayerUI[];

  const bench: PlayerUI[] = benchIds
    .map((id: number) => {
      const p = byId.get(id);
      if (!p) return undefined;
      return {
        id: p.id,
        name: p.name,
        position: normalizePos(p.position),
        rating: p.rating ?? 0,
        isInjured: injured.has(p.id), // if they were injured previously, still flagged
      } as PlayerUI;
    })
    .filter(Boolean) as PlayerUI[];

  return {
    side,
    subsRemaining: Math.max(0, 3 - subsMade),
    lineup: sortPlayersForUI(lineup),
    bench: sortPlayersForUI(bench),
  };
}

/* ----------------------------------- GET ----------------------------------- */
/**
 * GET /api/matchstate/:matchId
 * Query (optional):
 *  - side=home|away
 *  - teamId=<number>
 *
 * Returns a hydrated view for ONE side: { side, lineup, bench, subsRemaining }
 */
router.get(
  "/:matchId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = Number(req.params.matchId);
      if (!Number.isFinite(matchId)) {
        return res.status(400).json({ error: "Invalid matchId" });
      }

      // Resolve the match to infer sides if needed
      const match = await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
        select: { homeTeamId: true, awayTeamId: true },
      });
      if (!match) return res.status(404).json({ error: "Match not found" });

      const side = await resolveSide(req, match.homeTeamId, match.awayTeamId);

      // Ensure DB state exists, then return FE-shaped public state
      await ensureInitialMatchState(matchId);
      const state = await buildPublicSideState(matchId, side);

      return res.json(state);
    } catch (err) {
      next(err);
    }
  }
);

/* ---------------------------------- POST ---------------------------------- */
/**
 * POST /api/matchstate/:matchId/substitute
 * Body: { out: number, in: number, isHomeTeam: boolean }
 *    or { outId: number, inId: number, isHomeTeam: boolean }
 *
 * Returns: { side, lineup, bench, subsRemaining } for that side (post-sub)
 */
router.post(
  "/:matchId/substitute",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = Number(req.params.matchId);
      // Accept both naming styles to be forgiving
      const out: number =
        typeof req.body?.out === "number" ? req.body.out : req.body?.outId;
      const incoming: number =
        typeof req.body?.in === "number" ? req.body.in : req.body?.inId;
      const isHomeTeam: boolean = req.body?.isHomeTeam;

      if (
        !Number.isFinite(matchId) ||
        !Number.isFinite(out) ||
        !Number.isFinite(incoming) ||
        typeof isHomeTeam !== "boolean"
      ) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      await applySubstitution(matchId, Number(out), Number(incoming), Boolean(isHomeTeam));

      const side: Side = isHomeTeam ? "home" : "away";
      const updated = await buildPublicSideState(matchId, side);

      return res.json(updated);
    } catch (err: any) {
      // Map well-known errors from matchService.applySubstitution to HTTP statuses/messages
      const msg = String(err?.message ?? "");

      if (/No substitutions remaining/i.test(msg)) {
        return res.status(400).json({ error: "No substitutions remaining." });
      }
      if (/not in lineup/i.test(msg)) {
        return res.status(400).json({ error: "Selected outgoing player is not on the field." });
      }
      if (/not on bench/i.test(msg)) {
        return res.status(400).json({ error: "Selected incoming player is not on the bench." });
      }
      if (/Goalkeeper can only be substituted by another goalkeeper/i.test(msg)) {
        return res.status(409).json({
          error: "Goalkeeper can only be substituted by another goalkeeper.",
        });
      }
      if (/Cannot field two goalkeepers/i.test(msg)) {
        return res.status(409).json({ error: "Cannot have two goalkeepers on the field." });
      }

      // Fallback
      return res.status(400).json({ error: err?.message ?? "Substitution failed." });
    }
  }
);

export default router;
