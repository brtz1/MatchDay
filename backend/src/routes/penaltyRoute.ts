// backend/src/routes/penaltyRoute.ts

import express, { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import {
  resolveMatchPenalty,
  simulateShootout,
  getInteractivePkState,
} from "../services/penaltyService";

const router = express.Router();

/* ----------------------------- helpers ----------------------------- */

function parseNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractOnPitchIds(state: any, isHomeTeam: boolean): number[] {
  if (!state) return [];
  const lineupKey = isHomeTeam ? "homeLineup" : "awayLineup";
  if (Array.isArray(state?.[lineupKey])) return state[lineupKey] as number[];

  const onPitchKey = isHomeTeam ? "homeOnPitch" : "awayOnPitch";
  if (Array.isArray(state?.[onPitchKey])) return state[onPitchKey] as number[];

  if (Array.isArray(state?.lineup?.[isHomeTeam ? "home" : "away"])) {
    return state.lineup[isHomeTeam ? "home" : "away"] as number[];
  }
  return [];
}

/* ------------------------------- routes ------------------------------ */

/**
 * GET /pk/state
 * Returns the current interactive shootout snapshot so the FE can render immediately
 * when landing on the PK page (and then continue live via sockets).
 * - If `saveGameId` is not supplied, we infer it from the GameState where stage === 'PENALTIES'.
 * Response: 200 { matchId, firstShooter, bestOf, homeOrder, awayOrder, homeQueue, awayQueue,
 *                 homeScore, awayScore, attemptNumber, roundNumber }
 *          404 if no interactive session is active.
 */
router.get(
  "/state",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let saveGameId = parseNum(req.query?.saveGameId as any);

      if (!saveGameId) {
        const gs = await prisma.gameState.findFirst({
          where: { gameStage: "PENALTIES" as any },
          select: { currentSaveGameId: true },
        });
        saveGameId = parseNum(gs?.currentSaveGameId);
      }

      if (!saveGameId) {
        return res.status(404).json({ error: "No active penalty shootout" });
      }

      const snapshot = getInteractivePkState(saveGameId);
      if (!snapshot) {
        return res.status(404).json({ error: "No active penalty shootout" });
      }

      return res.json(snapshot);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /pk/take
 * Body: { saveGameId: number, matchId: number, shooterId: number }
 *
 * Resolves a single *in-match* penalty kick. This endpoint assumes the UI already
 * emitted a "penalty-awarded" and paused the engine if the coached team is involved.
 * We validate basic integrity (match/save, player team, on-pitch) and compute outcome.
 *
 * Response: { outcome, description, homeGoals, awayGoals }
 * (Also broadcasts `penalty-result` socket event inside the service.)
 */
router.post(
  "/take",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = parseNum(req.body?.saveGameId);
      const matchId = parseNum(req.body?.matchId);
      const shooterId = parseNum(req.body?.shooterId);

      if (!saveGameId || !matchId || !shooterId) {
        return res
          .status(400)
          .json({ error: "saveGameId, matchId and shooterId are required" });
      }

      // Load match scoped to save
      const match = await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
        include: { state: true },
      });
      if (!match || match.saveGameId !== saveGameId) {
        return res.status(404).json({ error: "Match not found for saveGameId" });
      }

      // Shooter must belong to either team in this match
      const shooter = await prisma.saveGamePlayer.findUnique({
        where: { id: shooterId },
        select: { id: true, teamId: true, position: true },
      });
      if (!shooter) {
        return res.status(404).json({ error: "Shooter not found" });
      }

      const isHome =
        shooter.teamId === match.homeTeamId
          ? true
          : shooter.teamId === match.awayTeamId
          ? false
          : null;

      if (isHome === null) {
        return res
          .status(400)
          .json({ error: "Shooter does not belong to this match's teams" });
      }

      // Basic eligibility checks: must be on the field and not a GK
      const lineupIds = extractOnPitchIds(match.state as any, isHome);
      if (!lineupIds.includes(shooterId)) {
        return res.status(400).json({ error: "Shooter is not on the pitch" });
      }
      const pos = (shooter.position ?? "").toUpperCase();
      if (pos === "GK" || pos === "GOALKEEPER") {
        return res.status(400).json({ error: "Goalkeepers cannot take this PK" });
      }

      // Optional: ensure not RED or INJURY already recorded this match
      const blocked = await prisma.matchEvent.findFirst({
        where: {
          saveGameMatchId: matchId,
          saveGamePlayerId: shooterId,
          type: { in: ["RED", "INJURY"] as any }, // enum narrowed by TS; both exist in your schema
        },
        select: { id: true },
      });
      if (blocked) {
        return res
          .status(400)
          .json({ error: "Shooter is not eligible (injured or sent off)" });
      }

      // Resolve the penalty (service persists scoreboard on GOAL and broadcasts penalty-result)
      const result = await resolveMatchPenalty({
        matchId,
        shooterId,
        isHome,
      });

      return res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /pk/shootout/start
 * Body: { saveGameId: number, matchId: number, interactive?: boolean }
 *
 * Manual/test trigger to resolve a full penalty shootout.
 * - interactive=true → emits step-by-step PK events, changes stage to PENALTIES then RESULTS.
 * - interactive=false (default) → resolves instantly (no stage change), persists winner on scoreboard.
 *
 * Response:
 *  - interactive=false → returns the SimulateShootoutResult immediately.
 *  - interactive=true  → returns the SimulateShootoutResult after the interactive flow completes.
 */
router.post(
  "/shootout/start",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = parseNum(req.body?.saveGameId);
      const matchId = parseNum(req.body?.matchId);
      const interactive =
        typeof req.body?.interactive === "boolean"
          ? Boolean(req.body.interactive)
          : false;

      if (!saveGameId || !matchId) {
        return res
          .status(400)
          .json({ error: "saveGameId and matchId are required" });
      }

      const match = await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
        select: { saveGameId: true },
      });
      if (!match || match.saveGameId !== saveGameId) {
        return res.status(404).json({ error: "Match not found for saveGameId" });
      }

      const result = await simulateShootout({
        saveGameMatchId: matchId,
        interactive,
      });

      return res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
