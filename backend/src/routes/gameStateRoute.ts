import { Router, Request, Response, NextFunction } from "express";
import {
  ensureGameState,
  advanceStage,
  getGameState,
} from "../services/gameState";

const router = Router();

/* ------------------------------------------------------------------ GET /api/gamestate
   Always returns a GameState row (creates default if table empty) */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("🧪 About to fetch game state...");
    const state = await ensureGameState();
    console.log("✅ Fetched game state:", state);
    res.json(state);
  } catch (err) {
    console.error("❌ Error fetching game state:", err);
    res.status(500).json({ error: "Server error", details: err });
  }
});

/* ------------------------------------------------------------------ POST /api/gamestate/advance-stage */
router.post(
  "/advance-stage",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await advanceStage();
      res.status(200).json({
        message: `Advanced to ${updated.gameStage}`,
        gameStage: updated.gameStage,
      });
    } catch (err) {
      console.error("❌ Error advancing game stage:", err);
      next(err);
    }
  },
);

/* ------------------------------------------------------------------ POST /api/gamestate/set-save/:id */
router.post(
  "/set-save/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const saveGameId = parseInt(req.params.id, 10);
    if (isNaN(saveGameId)) {
      return res.status(400).json({ error: "Invalid save game ID" });
    }

    try {
      const updated = await ensureGameState({ saveGameId });
      res.status(200).json(updated);
    } catch (err) {
      console.error("❌ Failed to set save game ID in game state:", err);
      next(err);
    }
  },
);

export default router;
