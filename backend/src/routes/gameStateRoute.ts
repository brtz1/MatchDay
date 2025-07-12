import { Router, Request, Response, NextFunction } from "express";
import {
  ensureGameState,
  advanceStage,
} from "../services/gameState"; // <-- adjust alias if needed

const router = Router();

/* ------------------------------------------------------------------ GET /api/gamestate
   Always returns a GameState row (creates default if table empty) */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await ensureGameState();
    res.json(state);
  } catch (err) {
    console.error("❌ Error fetching game state:", err);
    next(err);
  }
});

/* ------------------------------------------------------------------ POST /api/gamestate/advance-stage */
router.post(
  "/advance-stage",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await advanceStage();
      res
        .status(200)
        .json({ message: `Advanced to ${updated.gameStage}`, gameStage: updated.gameStage });
    } catch (err) {
      console.error("❌ Error advancing game stage:", err);
      next(err);
    }
  },
);

export default router;
