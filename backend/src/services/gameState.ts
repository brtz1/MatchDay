// backend/src/services/gameState.ts

import prisma from "../utils/prisma";
import {
  GameStage,
  MatchdayType,
  GameState as GameStateModel,
} from "@prisma/client";

// Use the new finalize helper after the Standings grace:
import { finalizeStandingsAndAdvance } from "./matchdayService";
import { broadcastStageChanged } from "../sockets/broadcast";

/* -----------------------------------------------------------------------------
   Types & helpers
----------------------------------------------------------------------------- */

type GameStageStr = "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";

/** Public/view type that allows currentSaveGameId to be null (0 → null). */
export type GameStatePublic = Omit<GameStateModel, "currentSaveGameId"> & {
  currentSaveGameId: number | null;
};

function defaultData(): Omit<GameStateModel, "id"> {
  return {
    season: 1,
    coachTeamId: null,
    /**
     * IMPORTANT: We keep 0 at the DB layer in case your Prisma schema uses
     * a non-nullable Int. Do NOT emit this 0 to clients; use the public getter
     * below which normalizes it to null.
     */
    currentSaveGameId: 0,
    currentMatchday: 1,
    matchdayType: MatchdayType.LEAGUE,
    gameStage: GameStage.ACTION,
  };
}

function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday) ? MatchdayType.CUP : MatchdayType.LEAGUE;
}

function coerceStage(stage: GameStage | string | undefined): GameStage {
  if (!stage) return GameStage.ACTION;
  return typeof stage === "string"
    ? (GameStage[stage as keyof typeof GameStage] ?? GameStage.ACTION)
    : stage;
}

function coerceType(type: MatchdayType | string | undefined): MatchdayType {
  if (!type) return MatchdayType.LEAGUE;
  return typeof type === "string"
    ? (MatchdayType[type as keyof typeof MatchdayType] ?? MatchdayType.LEAGUE)
    : type;
}

/** Normalize a DB row so currentSaveGameId never emits 0 to callers. */
function normalizePublic<T extends { currentSaveGameId: number }>(row: T): Omit<T, "currentSaveGameId"> & { currentSaveGameId: number | null } {
  const { currentSaveGameId, ...rest } = row;
  return {
    ...rest,
    currentSaveGameId: currentSaveGameId && currentSaveGameId > 0 ? currentSaveGameId : null,
  } as any;
}

/** Resolve current matchday number for a given save (best-effort). */
async function getMatchdayNumberForSave(saveGameId: number): Promise<number | null> {
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { currentMatchday: true },
  });
  if (gs?.currentMatchday) return gs.currentMatchday;

  // Fallback: highest known matchday for this save
  const md = await prisma.matchday.findFirst({
    where: { saveGameId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return md?.number ?? null;
}

/* -----------------------------------------------------------------------------
   Public API – getters
----------------------------------------------------------------------------- */

/**
 * Raw DB row (might have currentSaveGameId === 0). Prefer getGameStatePublic()
 * if returning to clients or non-DB consumers.
 */
export async function getGameState(): Promise<GameStateModel | null> {
  return prisma.gameState.findFirst({
    include: { coachTeam: true },
  });
}

/** Public getter: never returns 0 for currentSaveGameId (0 → null). */
export async function getGameStatePublic(): Promise<GameStatePublic | null> {
  const row = await prisma.gameState.findFirst({
    include: { coachTeam: true },
  });
  if (!row) return null;
  return normalizePublic(row);
}

export async function getCurrentSaveGameId(): Promise<number | null> {
  const state = await getGameState();
  const id = state?.currentSaveGameId ?? 0;
  return id > 0 ? id : null;
}

export async function getCoachTeamId(): Promise<number | null> {
  const state = await getGameState();
  return state?.coachTeamId ?? null;
}

/* -----------------------------------------------------------------------------
   Public API – creation / ensure
----------------------------------------------------------------------------- */

/**
 * Ensures a GameState row exists. If `update.saveGameId` is given,
 * sets that on first create or on update. Keeps 0 at DB level if you pass 0.
 */
export async function ensureGameState(update?: { saveGameId?: number }) {
  let state = await prisma.gameState.findFirst();
  if (!state) {
    state = await prisma.gameState.create({
      data: {
        ...defaultData(),
        currentSaveGameId:
          typeof update?.saveGameId === "number" ? update.saveGameId : 0,
      },
    });
  } else if (update && typeof update.saveGameId === "number") {
    state = await prisma.gameState.update({
      where: { id: state.id },
      data: { currentSaveGameId: update.saveGameId },
    });
  }
  return state;
}

/* -----------------------------------------------------------------------------
   Public API – mutators (stage/save/team/matchday)
----------------------------------------------------------------------------- */

/**
 * Legacy/global setter (no broadcast).
 * Prefer setStage(saveGameId, stage) when you know the save.
 */
export async function setGameStage(stage: GameStage | string) {
  const current = await ensureGameState();
  const next = coerceStage(stage);
  return prisma.gameState.update({
    where: { id: current.id },
    data: { gameStage: next },
  });
}

/**
 * Save-scoped stage setter + broadcast to the save room.
 */
export async function setStage(saveGameId: number, stage: GameStage | string): Promise<void> {
  const next = coerceStage(stage);

  // Update the row(s) for this save (multi-save safe)
  await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: next },
  });

  // Resolve current matchday number (best-effort) and notify clients
  const matchdayNumber = await getMatchdayNumberForSave(saveGameId);
  broadcastStageChanged(
    {
      gameStage: (GameStage[next] ? (GameStage[next] as unknown as GameStageStr) : (next as unknown as GameStageStr)),
      matchdayNumber: matchdayNumber ?? undefined,
    },
    saveGameId
  );
}

/**
 * Atomically set the active save and, optionally, coach team / stage / type / matchday.
 * Keeps the old signature working: setCurrentSaveGame(saveGameId).
 */
export async function setCurrentSaveGame(
  saveGameId: number,
  opts?: {
    coachTeamId?: number | null;
    stage?: GameStage | string;
    matchdayType?: MatchdayType | string;
    currentMatchday?: number;
    broadcast?: boolean; // default false
  }
) {
  const state = await ensureGameState();
  const data: Partial<GameStateModel> = {
    currentSaveGameId: saveGameId,
  };

  if (opts) {
    if (opts.coachTeamId !== undefined) data.coachTeamId = opts.coachTeamId;
    if (opts.stage !== undefined) data.gameStage = coerceStage(opts.stage);
    if (opts.matchdayType !== undefined) data.matchdayType = coerceType(opts.matchdayType);
    if (opts.currentMatchday !== undefined) data.currentMatchday = opts.currentMatchday;
  }

  const updated = await prisma.gameState.update({
    where: { id: state.id },
    data,
  });

  if (opts?.broadcast && opts.stage !== undefined) {
    const md = await getMatchdayNumberForSave(saveGameId);
    broadcastStageChanged(
      { gameStage: coerceStage(opts.stage) as unknown as GameStageStr, matchdayNumber: md ?? undefined },
      saveGameId
    );
  }

  return updated;
}

/**
 * If you only want to set the coach team after the save is set.
 */
export async function setCoachTeam(coachTeamId: number) {
  const current = await ensureGameState();
  if (current.coachTeamId !== null) {
    console.warn("🛑 Coach team already set — skipping overwrite.");
    return current;
    // NOTE: if you want to allow overwriting, remove the guard above.
  }
  return prisma.gameState.update({
    where: { id: current.id },
    data: { coachTeamId },
  });
}

/** Directly set matchday number & type (does *not* touch gameStage) */
export async function setMatchday(
  matchdayNumber: number,
  type: MatchdayType | string
) {
  const current = await ensureGameState();
  const next = coerceType(type);
  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      currentMatchday: matchdayNumber,
      matchdayType: next,
    },
  });
}

/**
 * Manually bump matchday and reset to ACTION.
 * If saveGameId is provided, update the row that matches that save (multi-save safe).
 * Otherwise, update the single GameState row by id (legacy behavior).
 */
export async function advanceToNextMatchday(saveGameId?: number) {
  if (typeof saveGameId === "number") {
    // Multi-save safe path
    const state = await prisma.gameState.findFirst({
      where: { currentSaveGameId: saveGameId },
    });
    if (!state) {
      // Fallback to legacy ensure if save not matched
      const s = await ensureGameState();
      return prisma.gameState.update({
        where: { id: s.id },
        data: {
          currentMatchday: s.currentMatchday + 1,
          matchdayType: getMatchdayTypeForNumber(s.currentMatchday + 1),
          gameStage: GameStage.ACTION,
        },
      });
    }
    const next = state.currentMatchday + 1;
    return prisma.gameState.update({
      where: { id: state.id },
      data: {
        currentMatchday: next,
        matchdayType: getMatchdayTypeForNumber(next),
        gameStage: GameStage.ACTION,
      },
    });
  }

  // Legacy single-row behavior
  const state = await ensureGameState();
  const next = state.currentMatchday + 1;
  return prisma.gameState.update({
    where: { id: state.id },
    data: {
      currentMatchday: next,
      matchdayType: getMatchdayTypeForNumber(next),
      gameStage: GameStage.ACTION,
    },
  });
}

/* -----------------------------------------------------------------------------
   Matchday flow: RESULTS → STANDINGS → finalize (season/day advance)
----------------------------------------------------------------------------- */

/**
 * RESULTS → STANDINGS.
 * We no longer block with a server-side timer or auto-start the next matchday here.
 * Frontend shows the Standings Page with its own grace timer.
 * After grace, FE should call POST /matchday/finalize-standings,
 * which invokes finalizeStandingsAndAdvance(saveGameId) to:
 *   - increment currentMatchday (or reset season), and
 *   - set gameStage back to ACTION.
 *
 * Now also broadcasts `stage-changed` so clients update immediately.
 */
export async function advanceAfterResults(saveGameId: number): Promise<void> {
  // Prefer updating the row that matches this saveGameId (multi-save safe)
  const updated = await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: GameStage.STANDINGS },
  });

  // Fallback for schemas with a single GameState row
  if (updated.count === 0) {
    const state = await ensureGameState();
    await prisma.gameState.update({
      where: { id: state.id },
      data: { gameStage: GameStage.STANDINGS },
    });
  }

  // Notify clients for this save
  const matchdayNumber = await getMatchdayNumberForSave(saveGameId);
  broadcastStageChanged(
    { gameStage: "STANDINGS", matchdayNumber: matchdayNumber ?? undefined },
    saveGameId
  );
}

/**
 * Helper the backend (or a route) can call after the Standings grace:
 * runs finalizeStandingsAndAdvance(saveGameId) to move to next day (or new season)
 * and return the updated GameState.
 */
export async function finalizeStandings(saveGameId: number): Promise<GameStateModel> {
  return finalizeStandingsAndAdvance(saveGameId);
}

/* -----------------------------------------------------------------------------
   Alias (for legacy imports)
----------------------------------------------------------------------------- */
export const initializeGameState = ensureGameState;
