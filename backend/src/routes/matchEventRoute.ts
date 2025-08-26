// backend/src/routes/matchEventRoute.ts

import express from "express";
import {
  getEventsByMatchIdDTO,
  getEventsByMatchdayNumberDTO,
} from "../services/matchEventService";

const router = express.Router();

/**
 * GET /api/match-events/by-matchday/:number
 * Returns: Record<saveGameMatchId, MatchEventDTO[]>
 * Notes:
 *  - Uses current save + stage from GameState internally.
 *  - Route is placed BEFORE "/:matchId" to avoid shadowing ("by-matchday" matching :matchId).
 */
router.get("/by-matchday/:number", async (req, res, next) => {
  try {
    const number = Number(req.params.number);
    if (Number.isNaN(number)) {
      return res.status(400).json({ error: "Invalid matchday number" });
    }

    const grouped = await getEventsByMatchdayNumberDTO(number);
    return res.json(grouped);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/match-events/:matchId
 * Returns: MatchEventDTO[] for a single SaveGameMatch.id
 */
router.get("/:matchId", async (req, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (Number.isNaN(matchId)) {
      return res.status(400).json({ error: "Invalid matchId" });
    }

    const events = await getEventsByMatchIdDTO(matchId);
    return res.json(events);
  } catch (e) {
    next(e);
  }
});

export default router;
