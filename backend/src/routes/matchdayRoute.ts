// backend/src/routes/matchdayRoute.ts

import express, { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import {
  startMatchday,
  getTeamMatchInfo as svcGetTeamMatchInfo,
} from "../services/matchdayService";
import { startOrResumeMatchday } from "../services/matchService"; // ← ensure engine import here
import { setStageForSave } from "../services/gameState";

const router = express.Router();

/* ----------------------------- helpers ----------------------------- */

function parseNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------- routes ------------------------------ */

/**
 * POST /api/matchday/advance
 * Body: { saveGameId: number }
 * Starts the matchday simulation using the CURRENT saved selection in MatchState.
 * Uses orchestration pipeline in matchdayService (engine + post-processing).
 */
router.post(
  "/advance",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = parseNum(req.body?.saveGameId);
      if (!saveGameId)
        return res.status(400).json({ error: "saveGameId required" });

      // Ensure there is a GameState row for this save and it's consistent
      const gs = await prisma.gameState.findFirst({
        where: { currentSaveGameId: saveGameId },
        select: {
          coachTeamId: true,
          currentMatchday: true,
          matchdayType: true,
        },
      });
      if (!gs)
        return res
          .status(404)
          .json({ error: "GameState not found for this save" });
      if (gs.coachTeamId == null || gs.currentMatchday == null) {
        return res
          .status(400)
          .json({ error: "Coach/team or matchday not set" });
      }

      // Start the matchday (engine start + post-processing handled inside)
      const updated = await startMatchday(saveGameId);
      return res.json({
        gameStage: updated.gameStage,
        matchdayNumber: updated.currentMatchday,
      });
    } catch (err) {
      next(err);
    }
  }
);

/** Alias so FE fallback stops 404’ing (orchestration as well) */
router.post("/start", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = parseNum(req.body?.saveGameId);
    if (!saveGameId)
      return res.status(400).json({ error: "saveGameId required" });

    const updated = await startMatchday(saveGameId);
    return res.json({
      gameStage: updated.gameStage,
      matchdayNumber: updated.currentMatchday,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/matchday/resume
 * Body: { saveGameId: number }
 * Convenience endpoint to explicitly resume the engine if it was paused or server restarted.
 * Sets stage → MATCHDAY and directly calls the engine's startOrResumeMatchday.
 */
router.post("/resume", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = parseNum(req.body?.saveGameId);
    if (!saveGameId)
      return res.status(400).json({ error: "saveGameId required" });

    // Flip stage first so the engine's pause loop exits
    await setStageForSave(saveGameId, "MATCHDAY");

    // Kick (or re-kick) the engine loop
    await startOrResumeMatchday(saveGameId);

    return res.json({ ok: true, gameStage: "MATCHDAY" });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/matchday/set-stage
 * Body: {
 *   saveGameId: number,
 *   stage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS" | "PENALTIES"
 * }
 *
 * NOTE:
 *  - Setting to "HALFTIME" will cause the engine to pause (it polls this flag).
 *  - Setting to "MATCHDAY" will resume the engine (it sees the flag and continues).
 *  - You can also call /resume which sets to MATCHDAY and restarts the loop if needed.
 *  - "PENALTIES" is used during interactive PK shootouts (engine/PK service will flip to RESULTS at end).
 */
router.post("/set-stage", async (req, res, next) => {
  try {
    const saveGameId = Number(req.body?.saveGameId);
    const stageStr = String(req.body?.stage ?? "");

    const allowed = ["ACTION", "MATCHDAY", "HALFTIME", "RESULTS", "STANDINGS", "PENALTIES"] as const;
    type StageStr = typeof allowed[number];

    if (!Number.isFinite(saveGameId) || saveGameId <= 0) {
      return res.status(400).json({ error: "saveGameId required" });
    }
    if (!allowed.includes(stageStr as StageStr)) {
      return res.status(400).json({ error: "Invalid stage" });
    }

    const out = await setStageForSave(saveGameId, stageStr as StageStr);
    return res.json(out); // { gameStage }
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/matchday/team-match-info?saveGameId=&matchday=&teamId=
 * → { saveGameId, matchdayId, matchId, isHomeTeam, homeTeamId, awayTeamId, opponentTeamId }
 */
router.get(
  "/team-match-info",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = parseNum(req.query.saveGameId);
      const matchday = parseNum(req.query.matchday);
      const teamId = parseNum(req.query.teamId);
      if (!saveGameId || !matchday || !teamId) {
        return res
          .status(400)
          .json({ error: "saveGameId, matchday and teamId are required" });
      }
      const { matchId, isHomeTeam } = await svcGetTeamMatchInfo(
        saveGameId,
        matchday,
        teamId
      );

      const m = await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
        select: { matchdayId: true, homeTeamId: true, awayTeamId: true },
      });
      if (!m) return res.status(404).json({ error: "Match not found" });

      const opponentTeamId = isHomeTeam ? m.awayTeamId : m.homeTeamId;
      return res.json({
        saveGameId,
        matchdayId: m.matchdayId,
        matchId,
        isHomeTeam,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        opponentTeamId,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
