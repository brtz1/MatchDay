import { Router, Request, Response, NextFunction } from "express";
import {
  ensureGameState,
  getGameStatePublic,
  setGameStage,             // legacy/global only
  setStageForSave,          // ✅ canonical save-scoped setter
  setCurrentSaveGame,
} from "../services/gameState";

const router = Router();

/* ------------------------------------------------------------------ GET /api/gamestate
   Always returns a GameState row (creates default if table empty)
   IMPORTANT: response is NORMALIZED (never emits currentSaveGameId: 0) */
router.get("/", async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    // Ensure the row exists, then return the normalized/public snapshot
    await ensureGameState();
    const state = await getGameStatePublic();
    res.json(state);
  } catch (err) {
    console.error("❌ Error fetching game state:", err);
    res
      .status(500)
      .json({ error: "Server error", details: (err as Error).message });
  }
});

/* ------------------------------------------------------------------ POST /api/gamestate/advance-stage
   NEW (save-scoped): requires { saveGameId }
   Cycles: ACTION → MATCHDAY → HALFTIME → RESULTS → STANDINGS → ACTION
   Uses the save pointer so each save can advance independently. */
router.post(
  "/advance-stage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { saveGameId } = req.body as { saveGameId?: number };
      if (!saveGameId || saveGameId <= 0) {
        return res.status(400).json({ error: "saveGameId is required" });
      }

      // Point the singleton to this save, read its current stage
      await ensureGameState({ saveGameId });
      const current = await getGameStatePublic();
      const now = (current?.gameStage ?? "ACTION") as
        | "ACTION"
        | "MATCHDAY"
        | "HALFTIME"
        | "RESULTS"
        | "STANDINGS";

      const flow: Record<
        "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS",
        "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS"
      > = {
        ACTION: "MATCHDAY",
        MATCHDAY: "HALFTIME",
        HALFTIME: "RESULTS",
        RESULTS: "STANDINGS",
        STANDINGS: "ACTION",
      };

      const nextStage = flow[now] ?? "ACTION";
      await setStageForSave(saveGameId, nextStage);

      res.status(200).json({
        message: `Advanced to ${nextStage}`,
        saveGameId,
        gameStage: nextStage,
      });
    } catch (err) {
      console.error("❌ Error advancing game stage:", err);
      next(err);
    }
  }
);

/* ----------- POST /api/gamestate/set-stage
   Explicit save-scoped setter: { saveGameId, stage }
   Delegates to the canonical service (room-scoped socket emit, consistent DB write). */
router.post(
  "/set-stage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = Number(req.body?.saveGameId);
      const stage = String(req.body?.stage ?? "");

      if (!Number.isFinite(saveGameId) || saveGameId <= 0) {
        return res.status(400).json({ error: "saveGameId is required" });
      }
      if (!stage) {
        return res.status(400).json({ error: "stage is required" });
      }

      const out = await setStageForSave(saveGameId, stage);
      // Keep BC by echoing saveGameId back
      res.status(200).json({ saveGameId, ...out }); // { saveGameId, gameStage }
    } catch (err) {
      console.error("❌ Error setting stage:", err);
      next(err);
    }
  }
);

/* ------------------------------------------------------------------ POST /api/gamestate/set-save/:id
   Keep existing behavior: set currentSaveGameId and return normalized state.
   (This only moves the pointer; it does not change coach or stage.) */
router.post(
  "/set-save/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const saveGameId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(saveGameId) || saveGameId <= 0) {
      return res.status(400).json({ error: "Invalid save game ID" });
    }

    try {
      await ensureGameState({ saveGameId });
      const state = await getGameStatePublic();
      res.status(200).json(state);
    } catch (err) {
      console.error("❌ Failed to set save game ID in game state:", err);
      next(err);
    }
  }
);

/* ------------------------------------------------------------------ POST /api/gamestate/set-coach
   Helper to atomically set the active save AND its coach team.
   Body: { saveGameId: number, coachTeamId: number } */
router.post(
  "/set-coach",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { saveGameId, coachTeamId } = req.body as {
        saveGameId?: number;
        coachTeamId?: number;
      };
      if (!saveGameId || saveGameId <= 0) {
        return res.status(400).json({ error: "saveGameId is required" });
      }
      if (!coachTeamId || coachTeamId <= 0) {
        return res.status(400).json({ error: "coachTeamId is required" });
      }

      // Point to this save and set coach team
      await setCurrentSaveGame(saveGameId, { coachTeamId });

      const state = await getGameStatePublic();
      res.status(200).json(state);
    } catch (err) {
      console.error("❌ Error setting coach team:", err);
      next(err);
    }
  }
);

/* ------------------------------------------------------------------ LEGACY (optional): POST /api/gamestate/advance-stage-global
   Kept only if you still need a global toggle that ignores save scoping.
   Prefer /advance-stage (save-scoped) above. */
router.post(
  "/advance-stage-global",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureGameState();
      const current = await getGameStatePublic();
      const now = current?.gameStage ?? "ACTION";
      const flow: Record<
        "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS",
        "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS"
      > = {
        ACTION: "MATCHDAY",
        MATCHDAY: "HALFTIME",
        HALFTIME: "RESULTS",
        STANDINGS: "ACTION",
        RESULTS: "STANDINGS",
      };
      const nextStage = flow[now as keyof typeof flow] ?? "ACTION";
      await setGameStage(nextStage);
      res.status(200).json({ message: `Advanced to ${nextStage}`, gameStage: nextStage });
    } catch (err) {
      console.error("❌ Error advancing global stage:", err);
      next(err);
    }
  }
);

export default router;
