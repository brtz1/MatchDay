// backend/src/routes/matchBroadcastRoute.ts

import { Router, Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { getGameState } from "../services/gameState";

const router = Router();

/**
 * POST /api/broadcast/matchday
 *
 * ❗️Deprecated: use POST /api/matchday/advance instead.
 * This endpoint is kept for backward compatibility. It validates the current
 * GameState + Matchday and returns a 202 Accepted, indicating the caller
 * should switch to the new engine entrypoint.
 */
router.post(
  "/matchday",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = await getGameState();

      if (!state?.currentSaveGameId || state.currentSaveGameId <= 0) {
        return res.status(400).json({ error: "No active save game found" });
      }

      const matchday = await prisma.matchday.findFirst({
        where: {
          saveGameId: state.currentSaveGameId,
          number: state.currentMatchday,
          type: state.matchdayType,
        },
        select: { id: true, number: true, type: true },
      });

      if (!matchday) {
        return res.status(404).json({ error: "Matchday not found" });
      }

      // No more in-process broadcast kick-off here.
      // The simulation/broadcast is driven by /api/matchday/advance and sockets.
      return res.status(202).json({
        message:
          "Deprecated: use POST /api/matchday/advance to start the live engine.",
        details: {
          matchdayId: matchday.id,
          number: matchday.number,
          type: matchday.type,
          saveGameId: state.currentSaveGameId,
        },
      });
    } catch (error) {
      console.error("❌ Broadcast endpoint error:", error);
      next(error);
    }
  }
);

export default router;
