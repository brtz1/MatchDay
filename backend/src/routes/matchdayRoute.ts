// backend/src/routes/matchdayRoute.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import prisma from "../utils/prisma";
import { getGameState } from "../services/gameState";
import {
  startOrResumeMatchday,
  pauseMatchday,
  stopMatchday,
} from "../services/matchdayEngine";
import { broadcastStageChanged } from "../sockets/broadcast";
import { finalizeStandingsAndAdvance } from "../services/matchdayService";

const router = Router();

type GameStage = "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";

/**
 * GET /api/matchday/team-match-info
 * Query: saveGameId, matchday, teamId
 * Returns:
 * {
 *   saveGameId,
 *   matchdayId,
 *   matchId,
 *   isHomeTeam,
 *   homeTeamId,
 *   awayTeamId,
 *   opponentTeamId
 * }
 *
 * Notes:
 * - Validates that the team belongs to the given saveGameId to avoid cross-save confusion.
 */
router.get(
  "/team-match-info",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = Number(req.query.saveGameId);
      const matchdayNumber = Number(req.query.matchday);
      const teamId = Number(req.query.teamId);

      if (
        !Number.isFinite(saveGameId) ||
        !Number.isFinite(matchdayNumber) ||
        !Number.isFinite(teamId)
      ) {
        return res
          .status(400)
          .json({ error: "saveGameId, matchday, and teamId are required numeric values" });
      }

      // Ensure the team exists AND belongs to this save
      const team = await prisma.saveGameTeam.findUnique({
        where: { id: teamId },
        select: { id: true, saveGameId: true },
      });
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      if (team.saveGameId !== saveGameId) {
        return res.status(400).json({
          error:
            "Team does not belong to the provided saveGameId. Check your GameState vs selected save.",
        });
      }

      // Find the requested matchday under this save
      const md = await prisma.matchday.findFirst({
        where: { saveGameId, number: matchdayNumber },
        select: {
          id: true,
          number: true,
          saveGameMatches: {
            select: {
              id: true,
              homeTeamId: true,
              awayTeamId: true,
            },
          },
        },
      });

      if (!md) return res.status(404).json({ error: "Matchday not found" });

      const found = md.saveGameMatches.find(
        (m) => m.homeTeamId === teamId || m.awayTeamId === teamId
      );
      if (!found) {
        return res.status(404).json({ error: "Team not found in this matchday" });
      }

      const isHomeTeam = found.homeTeamId === teamId;
      const opponentTeamId = isHomeTeam ? found.awayTeamId : found.homeTeamId;

      return res.status(200).json({
        saveGameId,
        matchdayId: md.id,
        matchId: found.id,
        isHomeTeam,
        homeTeamId: found.homeTeamId,
        awayTeamId: found.awayTeamId,
        opponentTeamId,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/matchday/set-stage
 * Body: { saveGameId: number, stage: GameStage }
 * Sets stage and controls the live engine accordingly.
 */
router.post(
  "/set-stage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { saveGameId, stage } = req.body as {
        saveGameId?: number;
        stage?: GameStage;
      };

      if (!saveGameId || typeof saveGameId !== "number") {
        return res.status(400).json({ error: "saveGameId is required" });
      }
      const allowed: GameStage[] = ["ACTION", "MATCHDAY", "HALFTIME", "RESULTS", "STANDINGS"];
      if (!stage || !allowed.includes(stage)) {
        return res.status(400).json({ error: "Invalid or missing stage" });
      }

      // Update GameState row(s) tied to this save
      const updated = await prisma.gameState.updateMany({
        where: { currentSaveGameId: saveGameId },
        data: { gameStage: stage },
      });

      // Fallback for single-row GameState schemas
      if (updated.count === 0) {
        await prisma.gameState.update({
          where: { id: 1 },
          data: { currentSaveGameId: saveGameId, gameStage: stage },
        });
      }

      // Emit stage (room + optional global) for clients
      broadcastStageChanged({ gameStage: stage }, saveGameId, { alsoGlobal: true });

      // Control the live engine
      if (stage === "MATCHDAY") {
        await startOrResumeMatchday(saveGameId);
      } else if (stage === "HALFTIME") {
        pauseMatchday(saveGameId);
      } else {
        // ACTION / RESULTS / STANDINGS — stop any running loop
        stopMatchday(saveGameId);
      }

      return res.status(200).json({ gameStage: stage });
    } catch (err) {
      console.error("❌ set-stage error:", err);
      next(err);
    }
  }
);

/**
 * POST /api/matchday/advance
 * Body:
 * {
 *   saveGameId: number,
 *   formation?: string,
 *   lineupIds?: number[],
 *   reserveIds?: number[] // optional; 0..8 allowed
 * }
 *
 * If selection is provided, validates (11 starters + exactly 1 GK) and persists into MatchState
 * for the coach team in the upcoming match. Then flips stage to MATCHDAY and starts engine.
 */
router.post(
  "/advance",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { saveGameId, formation, lineupIds, reserveIds } = req.body as {
        saveGameId?: number;
        formation?: string;
        lineupIds?: number[];
        reserveIds?: number[];
      };

      if (!saveGameId || typeof saveGameId !== "number") {
        return res.status(400).json({ error: "saveGameId is required" });
      }

      const gs = await getGameState();
      if (!gs || gs.currentSaveGameId !== saveGameId) {
        return res.status(400).json({ error: "No active save or mismatched saveGameId" });
      }
      if (!gs.coachTeamId) {
        return res.status(400).json({ error: "Coach team is not set in GameState" });
      }

      // Locate the current matchday (and matches for team lookup)
      const md = await prisma.matchday.findFirst({
        where: {
          saveGameId,
          number: gs.currentMatchday,
          type: gs.matchdayType,
        },
        select: {
          id: true,
          number: true,
          type: true,
          saveGameMatches: {
            select: { id: true, homeTeamId: true, awayTeamId: true },
          },
        },
      });
      if (!md) {
        return res.status(404).json({ error: "Matchday not found" });
      }

      // Find the coach's match in this round
      const coachMatch = md.saveGameMatches.find(
        (m) => m.homeTeamId === gs.coachTeamId || m.awayTeamId === gs.coachTeamId
      );
      if (!coachMatch) {
        return res.status(404).json({ error: "Coach team has no match in this round" });
      }
      const isHomeTeam = coachMatch.homeTeamId === gs.coachTeamId;
      const teamId = isHomeTeam ? coachMatch.homeTeamId : coachMatch.awayTeamId;

      // If FE sent a selection, validate & persist into MatchState
      if (formation && Array.isArray(lineupIds)) {
        // Must be exactly 11 starters
        if (lineupIds.length !== 11) {
          return res.status(400).json({ error: "Lineup must have exactly 11 players" });
        }

        // Ensure all starters belong to the coach team and count GK
        const starters = await prisma.saveGamePlayer.findMany({
          where: { id: { in: lineupIds } },
          select: { id: true, teamId: true, position: true },
        });
        if (starters.length !== lineupIds.length) {
          return res.status(400).json({ error: "Some selected starters do not exist" });
        }
        const wrongTeam = starters.find((p) => p.teamId !== teamId);
        if (wrongTeam) {
          return res.status(400).json({ error: "Starter selection contains players from another team" });
        }
        const gkCount = starters.filter((p) => p.position === "GK").length;
        if (gkCount !== 1) {
          return res.status(400).json({ error: "Lineup must include exactly 1 GK" });
        }

        // Validate reserves (optional). If provided, ensure same team and no duplicates with lineup.
        const bench = Array.isArray(reserveIds) ? reserveIds : [];
        if (bench.length > 0) {
          const reserves = await prisma.saveGamePlayer.findMany({
            where: { id: { in: bench } },
            select: { id: true, teamId: true },
          });
          if (reserves.length !== bench.length) {
            return res.status(400).json({ error: "Some selected reserves do not exist" });
          }
          const badBench = reserves.find((p) => p.teamId !== teamId);
          if (badBench) {
            return res.status(400).json({ error: "Reserve selection contains players from another team" });
          }
          for (const id of bench) {
            if (lineupIds.includes(id)) {
              return res.status(400).json({ error: "A player cannot be both in lineup and reserves" });
            }
          }
        }

        // Upsert MatchState for this SaveGameMatch and side
        const existing = await prisma.matchState.findUnique({
          where: { saveGameMatchId: coachMatch.id },
        });

        if (!existing) {
          await prisma.matchState.create({
            data: isHomeTeam
              ? {
                  saveGameMatchId: coachMatch.id,
                  homeFormation: formation,
                  homeLineup: lineupIds,
                  homeReserves: Array.isArray(reserveIds) ? reserveIds : [],
                  awayFormation: '4-4-2',
                  awayLineup: [],
                  awayReserves: [],
                  subsRemainingHome: 3,
                  subsRemainingAway: 3,
                }
              : {
                  saveGameMatchId: coachMatch.id,
                  awayFormation: formation,
                  awayLineup: lineupIds,
                  awayReserves: Array.isArray(reserveIds) ? reserveIds : [],
                  homeFormation: '4-4-2',
                  homeLineup: [],
                  homeReserves: [],
                  subsRemainingHome: 3,
                  subsRemainingAway: 3,
                },
          });
        } else {
          await prisma.matchState.update({
            where: { saveGameMatchId: coachMatch.id },
            data: isHomeTeam
              ? {
                  homeFormation: formation,
                  homeLineup: lineupIds,
                  homeReserves: Array.isArray(reserveIds) ? reserveIds : [],
                }
              : {
                  awayFormation: formation,
                  awayLineup: lineupIds,
                  awayReserves: Array.isArray(reserveIds) ? reserveIds : [],
                },
          });
        }
      }

      // Flip stage → MATCHDAY
      await prisma.gameState.update({
        where: { id: gs.id },
        data: { gameStage: "MATCHDAY" },
      });

      broadcastStageChanged({ gameStage: "MATCHDAY" }, saveGameId, { alsoGlobal: true });

      // Start the live engine loop (emits 'match-tick' / 'match-event')
      await startOrResumeMatchday(saveGameId);

      return res.status(200).json({
        saveGameId,
        matchdayId: md.id,
        message: "Matchday advanced; live engine started.",
      });
    } catch (err) {
      console.error("❌ advance error:", err);
      next(err);
    }
  }
);

/**
 * POST /api/matchday/advance-after-results
 * Body: { saveGameId?: number }
 * Helper to move RESULTS → STANDINGS (and notify clients).
 * Frontend: call this when matches end and you want to show tables.
 */
router.post(
  "/advance-after-results",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { saveGameId } = (req.body || {}) as { saveGameId?: number };
      const gs = await getGameState();

      const activeSaveId = saveGameId ?? gs?.currentSaveGameId;
      if (!activeSaveId) {
        return res.status(400).json({ error: "No active save found" });
      }

      if (gs) {
        await prisma.gameState.update({
          where: { id: gs.id },
          data: { gameStage: "STANDINGS" },
        });
      } else {
        await prisma.gameState.updateMany({
          where: { currentSaveGameId: activeSaveId },
          data: { gameStage: "STANDINGS" },
        });
      }

      broadcastStageChanged({ gameStage: "STANDINGS" }, activeSaveId, { alsoGlobal: true });

      return res.status(200).json({
        ok: true,
      });
    } catch (err) {
      console.error("❌ advance-after-results error:", err);
      next(err);
    }
  }
);

/**
 * POST /api/matchday/finalize-standings
 * Body: { saveGameId?: number }
 * STANDINGS → (increment currentMatchday) → ACTION
 * Call this after the Standings grace period so the Team Roster page lands on the next round.
 */
router.post("/finalize-standings", async (req, res, next) => {
  try {
    const { saveGameId } = (req.body || {}) as { saveGameId?: number };
    if (!saveGameId) return res.status(400).json({ error: "saveGameId is required" });

    const gs = await finalizeStandingsAndAdvance(saveGameId);
    broadcastStageChanged({ gameStage: gs.gameStage }, saveGameId, { alsoGlobal: true });
    return res.status(200).json({ ok: true, gameState: gs });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/matchday/debug/:saveGameId
 * Quick inspection of current stage, matchday, and match ids in the round.
 */
router.get("/debug/:saveGameId", async (req, res, next) => {
  try {
    const saveGameId = Number(req.params.saveGameId);
    if (!Number.isFinite(saveGameId)) {
      return res.status(400).json({ error: "bad saveGameId" });
    }

    const gs = await prisma.gameState.findFirst({
      where: { currentSaveGameId: saveGameId },
      select: { currentMatchday: true, gameStage: true },
    });

    const md = await prisma.matchday.findFirst({
      where: { saveGameId, number: gs?.currentMatchday ?? 1 },
      include: { saveGameMatches: { select: { id: true } } },
    });

    return res.json({
      stage: gs?.gameStage,
      currentMatchday: gs?.currentMatchday,
      matches: md?.saveGameMatches.map((m) => m.id) ?? [],
      count: md?.saveGameMatches.length ?? 0,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
