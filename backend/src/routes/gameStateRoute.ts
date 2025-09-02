// backend/src/routes/gameStateRoute.ts

import { Router, Request, Response, NextFunction } from "express";
import {
  ensureGameState,
  getGameStatePublic,
  setGameStage,
} from "../services/gameState";

const router = Router();

/* ------------------------------------------------------------------ GET /api/gamestate
   Always returns a GameState row (creates default if table empty)
   IMPORTANT: response is NORMALIZED (never emits currentSaveGameId: 0) */
router.get("/", async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    console.log("🧪 About to fetch game state...");
    // Ensure the row exists, then return the normalized/public snapshot
    await ensureGameState();
    const state = await getGameStatePublic();
    console.log("✅ Fetched game state:", state);
    res.json(state);
  } catch (err) {
    console.error("❌ Error fetching game state:", err);
    res
      .status(500)
      .json({ error: "Server error", details: (err as Error).message });
  }
});

/* ------------------------------------------------------------------ POST /api/gamestate/advance-stage
   Legacy/global: cycle stage ACTION → MATCHDAY → HALFTIME → RESULTS → STANDINGS → ACTION
   (no save scoping; mirrors old advanceStage() behavior) */
router.post(
  "/advance-stage",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // read current normalized state
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
        RESULTS: "STANDINGS",
        STANDINGS: "ACTION",
      };

      const nextStage = flow[now as keyof typeof flow] ?? "ACTION";
      await setGameStage(nextStage);

      res.status(200).json({
        message: `Advanced to ${nextStage}`,
        gameStage: nextStage,
      });
    } catch (err) {
      console.error("❌ Error advancing game stage:", err);
      next(err);
    }
  },
);

/* ------------------------------------------------------------------ POST /api/gamestate/set-save/:id
   Keeps existing behavior: set currentSaveGameId via ensureGameState({ saveGameId })
   and return the normalized state. */
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
  },
);

export default router;
