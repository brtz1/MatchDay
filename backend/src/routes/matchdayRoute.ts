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

    // Flip stage to MATCHDAY and lift pause gate (no new loop)
    await setStageForSave(saveGameId, "MATCHDAY");
    try {
      const { resumeMatchday } = await import("../services/matchService");
      await resumeMatchday(saveGameId);
    } catch {}

    return res.json({ ok: true, gameStage: "MATCHDAY" });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/matchday/set-stage
 * Body: { saveGameId: number, stage: "MATCHDAY"|"HALFTIME"|"RESULTS"|"STANDINGS"|"ACTION" }
 * Alias for the canonical gamestate setter to keep FE calls backward-compatible.
 */
router.post(
  "/set-stage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = parseNum(req.body?.saveGameId);
      const stage = String(req.body?.stage ?? "").trim();
      if (!saveGameId) return res.status(400).json({ error: "saveGameId required" });
      if (!stage) return res.status(400).json({ error: "stage required" });

      const out = await setStageForSave(saveGameId, stage as any);
      return res.json({ saveGameId, ...out }); // { saveGameId, gameStage }
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/matchday/pause
 * Body: { saveGameId: number }
 * Pauses the matchday engine for the given save and flips stage to HALFTIME.
 */
router.post('/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = parseNum(req.body?.saveGameId);
    if (!saveGameId) return res.status(400).json({ error: 'saveGameId required' });

    // Flip stage so FE/engine agree on state
    await setStageForSave(saveGameId, 'HALFTIME');

    // Best-effort: also mark the in-memory pause gate if engine loop uses it
    try {
      const { pauseMatchday } = await import('../services/matchService');
      await pauseMatchday(saveGameId);
    } catch {}

    return res.json({ ok: true, saveGameId, gameStage: 'HALFTIME' });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/matchday/team-match-info?saveGameId&matchday&teamId
 * Returns: { matchId, isHomeTeam }
 */
router.get(
  "/team-match-info",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = parseNum(req.query.saveGameId);
      const matchday = parseNum(req.query.matchday);
      const teamId = parseNum(req.query.teamId);
      if (!saveGameId || !matchday || !teamId) {
        return res.status(400).json({ error: "saveGameId, matchday and teamId are required" });
      }

      try {
        const info = await svcGetTeamMatchInfo(saveGameId, matchday, teamId);
        return res.json(info);
      } catch (err) {
        return res.status(404).json({ error: "Team match info not found" });
      }
    } catch (e) {
      next(e);
    }
  }
);
export default router;


