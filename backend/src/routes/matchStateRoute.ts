// backend/src/routes/matchStateRoute.ts

import express, { Request, Response, NextFunction } from "express";
import { MatchEventType } from "@prisma/client";
import prisma from "../utils/prisma";
import { ensureInitialMatchState } from "../services/matchService";

const router = express.Router();

type Side = "home" | "away";
type Position = "GK" | "DF" | "MF" | "AT";
type EnginePauseReason = "INJURY" | "GK_INJURY" | "GK_RED_NEEDS_GK";

type PlayerUI = {
  id: number;
  name: string;
  position: Position;
  rating: number;
  isInjured: boolean;
};

type PublicSideState = {
  side: Side;
  subsRemaining: number;
  lineup: PlayerUI[];
  bench: PlayerUI[];
};

/* --------------------------- helpers & normalization --------------------------- */

function normalizePos(p?: string | null): Position {
  const s = (p ?? "").toUpperCase();
  if (s === "GK" || s === "G" || s === "GOALKEEPER") return "GK";
  if (s === "DF" || s === "D" || s === "DEF" || s === "DEFENDER") return "DF";
  if (s === "MF" || s === "M" || s === "MID" || s === "MIDFIELDER") return "MF";
  if (s === "AT" || s === "F" || s === "FW" || s === "ATT" || s === "ATTACKER" || s === "ST")
    return "AT";
  return "MF";
}

function normalizeReason(x: any): EnginePauseReason | undefined {
  const s = typeof x === "string" ? x.trim().toUpperCase() : "";
  if (s === "INJURY" || s === "GK_INJURY" || s === "GK_RED_NEEDS_GK") return s as EnginePauseReason;
  return undefined;
}

const POSITION_ORDER: Record<Position, number> = { GK: 0, DF: 1, MF: 2, AT: 3 };

function sortPlayersForUI<T extends { position: Position; rating: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const byPos = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (byPos !== 0) return byPos;
    return b.rating - a.rating;
  });
}

async function getGameStateSafe() {
  try {
    const mod = await import("../services/gameState");
    return mod.getGameState();
  } catch {
    return null;
  }
}

async function resolveSide(req: Request, matchHomeId: number, matchAwayId: number): Promise<Side> {
  const sideParam = String(req.query.side ?? "").toLowerCase();
  const teamIdParam =
    req.query.teamId != null && String(req.query.teamId).trim() !== ""
      ? Number(req.query.teamId)
      : undefined;

  if (sideParam === "home") return "home";
  if (sideParam === "away") return "away";

  if (typeof teamIdParam === "number" && !Number.isNaN(teamIdParam)) {
    if (teamIdParam === matchHomeId) return "home";
    if (teamIdParam === matchAwayId) return "away";
  }

  const gs = await getGameStateSafe();
  if (gs?.coachTeamId === matchHomeId) return "home";
  if (gs?.coachTeamId === matchAwayId) return "away";

  return "home";
}

/** Load the raw MatchState (throws if not found). */
async function getMatchStateOrThrow(matchId: number) {
  const ms = await prisma.matchState.findUnique({ where: { saveGameMatchId: matchId } });
  if (!ms) throw new Error(`MatchState for match ${matchId} not found`);
  return ms;
}

/**
 * Build a hydrated, UI-ready state for one side.
 * - Keeps injured players ON the field; just flags `isInjured=true` (engine/red-removal happens elsewhere).
 * - Sorts players GK → DF → MF → AT, then by rating desc.
 */
async function buildPublicSideState(matchId: number, side: Side): Promise<PublicSideState> {
  const ms = await getMatchStateOrThrow(matchId);

  const lineupIds: number[] = (side === "home" ? ms.homeLineup : ms.awayLineup) ?? [];
  const benchIds: number[] = (side === "home" ? ms.homeReserves : ms.awayReserves) ?? [];
  const subsMade: number = side === "home" ? (ms.homeSubsMade ?? 0) : (ms.awaySubsMade ?? 0);

  const ids = [...lineupIds, ...benchIds];
  const players = ids.length
    ? await prisma.saveGamePlayer.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, position: true, rating: true },
      })
    : [];

  const byId = new Map(players.map((p) => [p.id, p]));

  // Injuries are tracked via MatchEvent (enum INJURY) – mark them, don't remove
  const injuryEvents = await prisma.matchEvent.findMany({
    where: {
      saveGameMatchId: matchId,
      type: MatchEventType.INJURY,
      saveGamePlayerId: { not: null },
    },
    select: { saveGamePlayerId: true },
  });
  const injured = new Set<number>(injuryEvents.map((e) => e.saveGamePlayerId!));

  const lineup: PlayerUI[] = lineupIds
    .map((id: number) => {
      const p = byId.get(id);
      if (!p) return undefined;
      return {
        id: p.id,
        name: p.name,
        position: normalizePos(p.position),
        rating: p.rating ?? 0,
        isInjured: injured.has(p.id),
      } as PlayerUI;
    })
    .filter(Boolean) as PlayerUI[];

  const bench: PlayerUI[] = benchIds
    .map((id: number) => {
      const p = byId.get(id);
      if (!p) return undefined;
      return {
        id: p.id,
        name: p.name,
        position: normalizePos(p.position),
        rating: p.rating ?? 0,
        isInjured: injured.has(p.id),
      } as PlayerUI;
    })
    .filter(Boolean) as PlayerUI[];

  return {
    side,
    subsRemaining: Math.max(0, 3 - subsMade),
    lineup: sortPlayersForUI(lineup),
    bench: sortPlayersForUI(bench),
  };
}

/* ----------------------------- substitutions ----------------------------- */

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Apply a substitution locally.
 * - Normal flow: `out` must be on the field.
 * - Injury/GK_RED flows: allow `out` to be already removed (engine/coach may have removed him).
 * - GK rules enforced: GK ↔ GK only; can't end up with 2 GKs.
 * - If FE forgets to send `reason`, we infer injury flow if the outgoing player has an INJURY event this match.
 */
async function applySubstitutionLocal(
  matchId: number,
  outId: number,
  inId: number,
  isHomeTeam: boolean,
  reason?: EnginePauseReason
): Promise<void> {
  const ms = await getMatchStateOrThrow(matchId);

  const lineup: number[] = uniq(isHomeTeam ? ms.homeLineup ?? [] : ms.awayLineup ?? []);
  const bench: number[] = uniq(isHomeTeam ? ms.homeReserves ?? [] : ms.awayReserves ?? []);
  const subsMade: number = isHomeTeam ? (ms.homeSubsMade ?? 0) : (ms.awaySubsMade ?? 0);

  if (subsMade >= 3) {
    throw new Error("No substitutions remaining");
  }

  // basic presence
  const outIdx = lineup.indexOf(outId);
  const inBenchIdx = bench.indexOf(inId);

  // infer injury flow if out is not on pitch but there is an injury event logged for him in this match
  let isInjuryFlow =
    reason === "INJURY" || reason === "GK_INJURY" || reason === "GK_RED_NEEDS_GK";

  if (!isInjuryFlow && outIdx === -1) {
    const recentInjury = await prisma.matchEvent.findFirst({
      where: {
        saveGameMatchId: matchId,
        type: MatchEventType.INJURY,
        saveGamePlayerId: outId,
      },
      select: { id: true },
      orderBy: { minute: "desc" },
    });
    if (recentInjury) isInjuryFlow = true;
  }

  if (!isInjuryFlow && outIdx === -1) {
    throw new Error("Selected outgoing player is not on the field");
  }
  if (inBenchIdx === -1) {
    throw new Error("Selected incoming player is not on the bench");
  }

  // Positions for GK rules
  const idsToLoad = uniq([...lineup, outId, inId]);
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: idsToLoad } },
    select: { id: true, position: true },
  });
  const posById = new Map<number, Position>(players.map((p) => [p.id, normalizePos(p.position)]));

  const outPos = posById.get(outId) ?? "MF";
  const inPos = posById.get(inId) ?? "MF";

  const gkOnField = lineup
    .map((id) => posById.get(id) ?? "MF")
    .filter((pos) => pos === "GK").length;

  // GK rules (apply in both normal and injury flows)
  if (outPos === "GK" && inPos !== "GK") {
    throw new Error("Goalkeeper can only be substituted by another goalkeeper");
  }
  if (outPos !== "GK" && inPos === "GK") {
    if (gkOnField >= 1) {
      throw new Error("Cannot have two goalkeepers on the field");
    }
  }

  // Apply swap
  let newLineup: number[];
  let newBench: number[];

  if (outIdx !== -1) {
    // Normal: out on field → move OUT to bench, IN to field
    newLineup = uniq(lineup.filter((id) => id !== outId).concat(inId));
    newBench = uniq(bench.filter((id) => id !== inId).concat(outId));
  } else {
    // Injury-flow: OUT already off → just move IN from bench to lineup
    newLineup = uniq(lineup.concat(inId));
    newBench = uniq(bench.filter((id) => id !== inId));
  }

  // Persist counters + arrays
  if (isHomeTeam) {
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: {
        homeLineup: newLineup,
        homeReserves: newBench,
        homeSubsMade: subsMade + 1,
        subsRemainingHome: Math.max(0, 3 - (subsMade + 1)),
      },
    });
  } else {
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: {
        awayLineup: newLineup,
        awayReserves: newBench,
        awaySubsMade: subsMade + 1,
        subsRemainingAway: Math.max(0, 3 - (subsMade + 1)),
      },
    });
  }
}

/* --------------------------- remove without sub --------------------------- */
/**
 * Remove a player from the lineup immediately (injury/red-card "no sub" path).
 * - Does NOT add the player to the bench.
 * - Does NOT change subs counters.
 */
async function removeFromLineupNoSub(
  matchId: number,
  playerId: number,
  isHomeTeam: boolean
): Promise<void> {
  const ms = await getMatchStateOrThrow(matchId);
  const lineup = isHomeTeam ? (ms.homeLineup ?? []) : (ms.awayLineup ?? []);
  const reserves = isHomeTeam ? (ms.homeReserves ?? []) : (ms.awayReserves ?? []);

  const exists = lineup.includes(playerId);
  if (!exists) {
    // If not on the field, nothing to do — be lenient.
    return;
  }

  const newLineup = lineup.filter((id) => id !== playerId);
  // Bench unchanged; counters unchanged
  if (isHomeTeam) {
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: {
        homeLineup: newLineup,
        homeReserves: reserves,
      },
    });
  } else {
    await prisma.matchState.update({
      where: { saveGameMatchId: matchId },
      data: {
        awayLineup: newLineup,
        awayReserves: reserves,
      },
    });
  }
}

/* ----------------------------------- GET ----------------------------------- */
/**
 * GET /api/matchstate/:matchId
 * Query (optional):
 *  - side=home|away
 *  - teamId=<number>
 *
 * Returns a hydrated view for ONE side: { side, lineup, bench, subsRemaining }
 */
router.get(
  "/:matchId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = Number(req.params.matchId);
      if (!Number.isFinite(matchId)) {
        return res.status(400).json({ error: "Invalid matchId" });
      }

      // Resolve the match to infer sides if needed
      const match = await prisma.saveGameMatch.findUnique({
        where: { id: matchId },
        select: { homeTeamId: true, awayTeamId: true },
      });
      if (!match) return res.status(404).json({ error: "Match not found" });

      const side = await resolveSide(req, match.homeTeamId, match.awayTeamId);

      // Ensure DB state exists, then return FE-shaped public state
      await ensureInitialMatchState(matchId);
      const state = await buildPublicSideState(matchId, side);

      return res.json(state);
    } catch (err) {
      next(err);
    }
  }
);

/* ---------------------------------- POST ---------------------------------- */
/**
 * POST /api/matchstate/:matchId/substitute
 * Body: {
 *   out?: number, outId?: number, outPlayerId?: number,
 *   in: number, inId?: number, inPlayerId?: number,
 *   isHomeTeam?: boolean, side?: "home"|"away",
 *   reason?: "INJURY"|"GK_INJURY"|"GK_RED_NEEDS_GK"
 * }
 *
 * Returns: { side, lineup, bench, subsRemaining } for that side (post-sub)
 */
router.post(
  "/:matchId/substitute",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = Number(req.params.matchId);

      const rawOut =
        req.body?.out ??
        req.body?.outId ??
        req.body?.outPlayerId;

      const rawIn =
        req.body?.["in"] ??
        req.body?.inId ??
        req.body?.inPlayerId;

      const rawSide: string | undefined = typeof req.body?.side === "string" ? req.body.side : undefined;
      const reason: EnginePauseReason | undefined = normalizeReason(req.body?.reason);

      // Normalize side / isHomeTeam
      let isHomeTeam: boolean | undefined;
      if (rawSide) {
        const sideNorm = String(rawSide).toLowerCase();
        if (sideNorm === "home") isHomeTeam = true;
        else if (sideNorm === "away") isHomeTeam = false;
        else return res.status(400).json({ error: `Invalid side: ${rawSide}` });
      } else {
        const rawIsHomeTeam = req.body?.isHomeTeam;
        if (typeof rawIsHomeTeam === "boolean") {
          isHomeTeam = rawIsHomeTeam;
        } else if (typeof rawIsHomeTeam === "string") {
          if (rawIsHomeTeam.toLowerCase() === "true") isHomeTeam = true;
          else if (rawIsHomeTeam.toLowerCase() === "false") isHomeTeam = false;
        }
      }

      // Coerce player ids (accept numeric strings)
      const out = Number(rawOut);
      const incoming = Number(rawIn);

      // Validate presence and types
      const problems: string[] = [];
      if (!Number.isFinite(matchId)) problems.push("matchId");
      // `out` may be missing from the field in injury flows, but still must be a number
      if (!Number.isFinite(out)) problems.push("out / outId / outPlayerId");
      if (!Number.isFinite(incoming)) problems.push("in / inId / inPlayerId");
      if (typeof isHomeTeam !== "boolean") problems.push("side or isHomeTeam");

      if (problems.length) {
        return res.status(400).json({
          error: `Invalid parameters: ${problems.join(", ")}`,
          details: { matchId, out: rawOut, in: rawIn, side: rawSide, isHomeTeam: req.body?.isHomeTeam },
        });
      }

      // (Optional) enforce pause/halftime before allowing subs
      // await ensureCanSubstitute(matchId);

      await applySubstitutionLocal(matchId, out, incoming, isHomeTeam!, reason);

      const side: Side = isHomeTeam ? "home" : "away";
      const updated = await buildPublicSideState(matchId, side);

      return res.json(updated);
    } catch (err: any) {
      const msg = String(err?.message ?? "");

      if (/No substitutions remaining/i.test(msg)) {
        return res.status(400).json({ error: "No substitutions remaining." });
      }
      if (/not on the field/i.test(msg)) {
        return res.status(400).json({ error: "Selected outgoing player is not on the field." });
      }
      if (/not on the bench/i.test(msg)) {
        return res.status(400).json({ error: "Selected incoming player is not on the bench." });
      }
      if (/Goalkeeper can only be substituted by another goalkeeper/i.test(msg)) {
        return res.status(409).json({
          error: "Goalkeeper can only be substituted by another goalkeeper.",
        });
      }
      if (/Cannot have two goalkeepers/i.test(msg)) {
        return res.status(409).json({ error: "Cannot have two goalkeepers on the field." });
      }

      return res.status(400).json({ error: err?.message ?? "Substitution failed." });
    }
  }
);

/**
 * POST /api/matchstate/:matchId/remove-player
 * Body: { playerId: number, isHomeTeam: boolean }
 *
 * Removes the player from the lineup immediately (no sub, no bench add, no counter change).
 * Returns: { side, lineup, bench, subsRemaining } for that side.
 */
router.post(
  "/:matchId/remove-player",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = Number(req.params.matchId);
      const playerId: number = req.body?.playerId;
      const isHomeTeam: boolean = req.body?.isHomeTeam;

      if (!Number.isFinite(matchId) || !Number.isFinite(playerId) || typeof isHomeTeam !== "boolean") {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      await removeFromLineupNoSub(matchId, Number(playerId), Boolean(isHomeTeam));

      const side: Side = isHomeTeam ? "home" : "away";
      const updated = await buildPublicSideState(matchId, side);
      return res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/matchstate/:matchId/pause
 * Body: { isPaused: boolean }
 *
 * Sets the isPaused flag for a given match. The engine loop should respect this flag.
 * (Main matchday pausing is done via /matchday/set-stage, which the engine honors.)
 */
router.post(
  "/:matchId/pause",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = Number(req.params.matchId);
      const isPaused = Boolean(req.body?.isPaused);
      if (!Number.isFinite(matchId)) return res.status(400).json({ error: "Invalid matchId" });

      await ensureInitialMatchState(matchId);
      const ms = await prisma.matchState.update({
        where: { saveGameMatchId: matchId },
        data: { isPaused },
        select: { isPaused: true },
      });
      return res.json({ ok: true, isPaused: ms.isPaused });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
