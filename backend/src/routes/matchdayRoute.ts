// backend/src/routes/matchdayRoute.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import prisma from "../utils/prisma";
import { getGameState } from "../services/gameState";
import {
  startOrResumeMatchday,
  pauseMatchday,
  stopMatchday,
} from "../services/matchdayEngine"; // <- aligns with your repo
import { broadcastStageChanged } from "../sockets/broadcast";

const router = Router();

export type GameStage =
  | "ACTION"
  | "MATCHDAY"
  | "HALFTIME"
  | "RESULTS"
  | "STANDINGS";

type SaveBody = { saveGameId?: number };
type SetStageBody = { saveGameId?: number; stage?: GameStage };

function toNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Resolve the active saveGameId from body or GameState service */
async function resolveSaveGameId(req: Request): Promise<number> {
  const bodyId = toNumber((req.body as SaveBody | undefined)?.saveGameId);
  if (bodyId != null) return bodyId;

  const gs = await getGameState();
  if (gs?.currentSaveGameId != null) return gs.currentSaveGameId;

  const err: any = new Error("No active save game");
  err.status = 404;
  throw err;
}

/** Resolve current matchday number from GameState (falls back to latest Matchday row) */
async function resolveCurrentMatchday(saveGameId: number): Promise<number> {
  const gs = await getGameState();
  if (gs?.currentSaveGameId === saveGameId && typeof gs.currentMatchday === "number") {
    return gs.currentMatchday;
  }
  const md = await prisma.matchday.findFirst({
    where: { saveGameId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  if (!md) {
    const err: any = new Error("No matchday found for save");
    err.status = 404;
    throw err;
  }
  return md.number;
}

/**
 * GET /api/matchday/status
 * Returns current stage and list of match ids for the current matchday.
 */
router.get(
  "/status",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const gs = await getGameState();
      if (!gs?.currentSaveGameId) {
        return res.status(404).json({ error: "No active save" });
      }

      const md = await prisma.matchday.findFirst({
        where: { saveGameId: gs.currentSaveGameId, number: gs.currentMatchday ?? undefined },
        include: { saveGameMatches: { select: { id: true } } },
      });

      return res.json({
        saveGameId: gs.currentSaveGameId,
        stage: gs.gameStage,
        currentMatchday: gs.currentMatchday ?? null,
        matches: md?.saveGameMatches.map((m) => m.id) ?? [],
        count: md?.saveGameMatches.length ?? 0,
      });
    } catch (e) {
      next(e);
    }
  }
);

// GET /api/matchday/team-match-info?saveGameId=&matchday=&teamId=
router.get('/team-match-info', async (req, res) => {
  const saveGameId = Number(req.query.saveGameId);
  const matchdayNumber = Number(req.query.matchday);
  const teamId = Number(req.query.teamId);

  if (!saveGameId || !matchdayNumber || !teamId) {
    return res.status(400).json({ error: 'saveGameId, matchday, teamId are required' });
  }

  const md = await prisma.matchday.findFirst({
    where: { saveGameId, number: matchdayNumber },
    select: { id: true },
  });
  if (!md) return res.status(404).json({ error: 'Matchday not found' });

  const match = await prisma.saveGameMatch.findFirst({
    where: {
      matchdayId: md.id,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return res.status(404).json({ error: 'Match not found for that team' });

  return res.json({ matchId: match.id, isHomeTeam: match.homeTeamId === teamId });
});

/**
 * POST /api/matchday/advance
 * - Set stage to MATCHDAY
 * - Emit stage-changed { gameStage, matchdayNumber }
 * - Kick off simulation in background (fire-and-forget)
 * - Return { saveGameId, matchdayNumber }
 */
router.post(
  "/advance",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = await resolveSaveGameId(req);
      const matchdayNumber = await resolveCurrentMatchday(saveGameId);

      // Flip DB stage first
      await prisma.gameState.updateMany({
        where: { currentSaveGameId: saveGameId },
        data: { gameStage: "MATCHDAY" },
      });

      // Notify clients immediately so Live page can join the room before ticks
      broadcastStageChanged({ gameStage: "MATCHDAY", matchdayNumber }, saveGameId);

      // Start simulation in background (do not await)
      Promise.resolve()
        .then(() => startOrResumeMatchday(saveGameId))
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("[matchdayRoute] startOrResumeMatchday failed:", err);
        });

      return res.json({ saveGameId, matchdayNumber });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/matchday/set-stage
 * Body: { saveGameId?: number, stage: GameStage }
 * Allows UI to toggle HALFTIME <-> MATCHDAY (and other admin transitions).
 * Emits stage-changed after DB update.
 */
router.post(
  "/set-stage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = await resolveSaveGameId(req);
      const body = (req.body as SetStageBody) ?? {};
      const stage = body.stage;
      const allowed: GameStage[] = ["ACTION", "MATCHDAY", "HALFTIME", "RESULTS", "STANDINGS"];
      if (!stage || !allowed.includes(stage)) {
        return res.status(400).json({ error: "Invalid or missing stage" });
      }

      await prisma.gameState.updateMany({
        where: { currentSaveGameId: saveGameId },
        data: { gameStage: stage },
      });

      const matchdayNumber = await resolveCurrentMatchday(saveGameId);
      broadcastStageChanged({ gameStage: stage, matchdayNumber }, saveGameId);

      return res.json({ saveGameId, stage, matchdayNumber });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/matchday/pause
 * Body: { saveGameId?: number }
 * Soft pause flag for the engine (optional; depends on your engine impl)
 */
router.post(
  "/pause",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = await resolveSaveGameId(req);
      await pauseMatchday(saveGameId).catch(() => void 0);
      await prisma.gameState.updateMany({
        where: { currentSaveGameId: saveGameId },
        data: { gameStage: "HALFTIME" },
      });
      const matchdayNumber = await resolveCurrentMatchday(saveGameId);
      broadcastStageChanged({ gameStage: "HALFTIME", matchdayNumber }, saveGameId);
      return res.json({ saveGameId, stage: "HALFTIME", matchdayNumber });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/matchday/stop
 * Body: { saveGameId?: number }
 * Hard stop the current simulation loop (optional; depends on your engine impl)
 */
router.post(
  "/stop",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveGameId = await resolveSaveGameId(req);
      await stopMatchday(saveGameId).catch(() => void 0);
      await prisma.gameState.updateMany({
        where: { currentSaveGameId: saveGameId },
        data: { gameStage: "ACTION" },
      });
      const matchdayNumber = await resolveCurrentMatchday(saveGameId);
      broadcastStageChanged({ gameStage: "ACTION", matchdayNumber }, saveGameId);
      return res.json({ saveGameId, stage: "ACTION", matchdayNumber });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
