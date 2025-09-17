// backend/src/routes/cupRoute.ts

import { Router, Request, Response, NextFunction } from "express";
import { getGameState } from "../services/gameState";
import { getCupLog } from "../services/cupBracketService";

const router = Router();

/**
 * GET /api/cup/log
 * Returns full cup tournament results grouped by stage (roundLabel / matchday).
 * Response shape matches the CupLogPage/CupBracket expectations:
 * [
 *   {
 *     matchdayNumber: number,
 *     roundLabel: string, // "Round of 128" | "Round of 64" | ... | "Final"
 *     matches: [
 *       {
 *         id: number,
 *         homeTeamId: number,
 *         awayTeamId: number,
 *         homeTeam: { name: string; goals: number | null },
 *         awayTeam: { name: string; goals: number | null },
 *         played: boolean
 *       }, ...
 *     ]
 *   }, ...
 * ]
 */
router.get(
  "/log",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const gameState = await getGameState();
      if (!gameState?.currentSaveGameId || gameState.currentSaveGameId <= 0) {
        return res.status(400).json({ error: "No active save game found" });
      }

      const cupLog = await getCupLog(gameState.currentSaveGameId);
      return res.status(200).json(cupLog);
    } catch (error) {
      console.error("❌ Error fetching cup log:", error);
      return next(error);
    }
  }
);

export default router;
