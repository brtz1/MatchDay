import prisma from "../utils/prisma";
import {
  GameStage,
  MatchdayType,
  GameState as GameStateModel,
} from "@prisma/client";

import { finalizeStandingsAndAdvance } from "./matchdayService";
import { broadcastStageChanged } from "../sockets/broadcast";

type GameStageStr =
  | "ACTION"
  | "MATCHDAY"
  | "HALFTIME"
  | "RESULTS"
  | "STANDINGS"
  | "PENALTIES";

export type GameStatePublic = Omit<GameStateModel, "currentSaveGameId"> & {
  currentSaveGameId: number | null;
};

/* ------------------------------------------------------------------ */
/* Helpers: coercion / validation                                     */
/* ------------------------------------------------------------------ */
const STAGES_SET = new Set<string>(Object.values(GameStage));
const TYPES_SET = new Set<string>(Object.values(MatchdayType));

function coerceStage(stage: GameStage | string | undefined): GameStage {
  if (!stage) return GameStage.ACTION;
  if (typeof stage !== "string") return stage;
  const s = stage.toUpperCase();

  // If callers try to use PENALTIES but schema wasn't migrated yet,
  // fail loud so developers notice instead of silently falling back.
  if (s === "PENALTIES" && !STAGES_SET.has("PENALTIES")) {
    throw new Error(
      'GameStage "PENALTIES" not found in schema. Run the migration that adds it to the enum before using this stage.'
    );
  }

  return STAGES_SET.has(s) ? (s as GameStage) : GameStage.ACTION;
}

function coerceType(type: MatchdayType | string | undefined): MatchdayType {
  if (!type) return MatchdayType.LEAGUE;
  if (typeof type !== "string") return type;
  const t = type.toUpperCase();
  return TYPES_SET.has(t) ? (t as MatchdayType) : MatchdayType.LEAGUE;
}

/* ------------------------------------------------------------------ */
/* Defaults / normalization                                           */
/* ------------------------------------------------------------------ */
function defaultData(): Omit<GameStateModel, "id"> {
  return {
    season: 1,
    coachTeamId: null,
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

async function resolveMatchdayType(
  saveGameId: number | null | undefined,
  matchdayNumber: number
): Promise<MatchdayType> {
  if (saveGameId && saveGameId > 0) {
    const md = await prisma.matchday.findFirst({
      where: { saveGameId, number: matchdayNumber },
      select: { type: true },
    });
    if (md?.type) return md.type;
  }
  return getMatchdayTypeForNumber(matchdayNumber);
}

function normalizePublic<T extends { currentSaveGameId: number }>(
  row: T
): Omit<T, "currentSaveGameId"> & { currentSaveGameId: number | null } {
  const { currentSaveGameId, ...rest } = row;
  return {
    ...rest,
    currentSaveGameId:
      currentSaveGameId && currentSaveGameId > 0 ? currentSaveGameId : null,
  } as any;
}

/** FIRST unplayed matchday for a save; if not found, return 1 */
async function getMatchdayNumberForSave(saveGameId: number): Promise<number | null> {
  // Prefer GameState's current pointer if it already targets this save
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { currentMatchday: true },
  });
  if (gs?.currentMatchday) return gs.currentMatchday;

  // Otherwise: first matchday that still has unplayed matches
  const md = await prisma.matchday.findFirst({
    where: {
      saveGameId,
      saveGameMatches: { some: { isPlayed: false } },
    },
    orderBy: { number: "asc" },
    select: { number: true },
  });
  return md?.number ?? 1;
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */
export async function getGameState(): Promise<GameStateModel | null> {
  return prisma.gameState.findFirst({
    include: { coachTeam: true },
  });
}

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

/**
 * Legacy helper: sets stage for the single GameState row (no save scoping).
 * Prefer `setStageForSave`.
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
 * ✅ Canonical function for routes/services to change stage for a specific save.
 * - Updates DB pointer(s) for that save.
 * - Emits room-scoped `stage-changed` with { gameStage, saveGameId, matchdayNumber? }.
 */
export async function setStageForSave(
  saveGameId: number,
  stage: GameStage | string
): Promise<{ gameStage: GameStage }> {
  const next = coerceStage(stage);

  // Persist (schema-agnostic, supports both "point to save" and fallback creation)
  const result = await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: next },
  });

  if (result.count === 0) {
    const state = await ensureGameState({ saveGameId });
    await prisma.gameState.update({
      where: { id: state.id },
      data: { gameStage: next },
    });
  }

  // Determine current matchday for payload
  const matchdayNumber = await getMatchdayNumberForSave(saveGameId);

  // Room-scoped emit (our patched broadcast adds saveGameId into payload)
  broadcastStageChanged(saveGameId, {
    gameStage: next as unknown as GameStageStr,
    matchdayNumber: matchdayNumber ?? undefined,
  });

  return { gameStage: next };
}

/** ⛔️ Deprecated name kept for BC – delegates to setStageForSave */
export async function setStage(
  saveGameId: number,
  stage: GameStage | string
): Promise<void> {
  await setStageForSave(saveGameId, stage);
}

/** BC alias that mirrors old naming */
export async function advanceStage(
  saveGameId: number,
  stage: GameStage | string
) {
  return setStageForSave(saveGameId, stage);
}

export async function setCurrentSaveGame(
  saveGameId: number,
  opts?: {
    coachTeamId?: number | null;
    stage?: GameStage | string;
    matchdayType?: MatchdayType | string;
    currentMatchday?: number;
    broadcast?: boolean;
  }
) {
  const state = await ensureGameState();

  const data: Partial<GameStateModel> = {
    currentSaveGameId: saveGameId,
  };

  if (opts) {
    if (opts.coachTeamId !== undefined) data.coachTeamId = opts.coachTeamId;
    if (opts.stage !== undefined) data.gameStage = coerceStage(opts.stage);

    if (opts.currentMatchday !== undefined) {
      data.currentMatchday = opts.currentMatchday;
      if (opts.matchdayType === undefined) {
        data.matchdayType = await resolveMatchdayType(
          saveGameId,
          opts.currentMatchday
        );
      }
    }

    if (opts.matchdayType !== undefined) {
      data.matchdayType = coerceType(opts.matchdayType);
    }
  }

  const updated = await prisma.gameState.update({
    where: { id: state.id },
    data,
  });

  if (opts?.broadcast && opts.stage !== undefined) {
    const md = await getMatchdayNumberForSave(saveGameId);
    broadcastStageChanged(saveGameId, {
      gameStage: coerceStage(opts.stage) as unknown as GameStageStr,
      matchdayNumber: md ?? undefined,
    });
  }

  return updated;
}

export async function setCoachTeam(
  coachTeamId: number,
  saveGameId?: number
) {
  if (typeof saveGameId === "number") {
    await ensureGameState({ saveGameId });
  } else {
    await ensureGameState();
  }

  const state = await prisma.gameState.findFirst();
  if (!state) throw new Error("GameState row not found after ensureGameState()");

  return prisma.gameState.update({
    where: { id: state.id },
    data: { coachTeamId },
  });
}

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

export async function advanceToNextMatchday(saveGameId?: number) {
  if (typeof saveGameId === "number") {
    const state = await prisma.gameState.findFirst({
      where: { currentSaveGameId: saveGameId },
    });
    if (!state) {
      const s = await ensureGameState({ saveGameId });
      const next = s.currentMatchday + 1;
      const resolvedType = await resolveMatchdayType(
        s.currentSaveGameId || null,
        next
      );
      return prisma.gameState.update({
        where: { id: s.id },
        data: {
          currentMatchday: next,
          matchdayType: resolvedType,
          gameStage: GameStage.ACTION,
        },
      });
    }
    const next = state.currentMatchday + 1;
    const resolvedType = await resolveMatchdayType(saveGameId, next);
    return prisma.gameState.update({
      where: { id: state.id },
      data: {
        currentMatchday: next,
        matchdayType: resolvedType,
        gameStage: GameStage.ACTION,
      },
    });
  }

  const state = await ensureGameState();
  const next = state.currentMatchday + 1;
  const resolvedType = await resolveMatchdayType(
    state.currentSaveGameId || null,
    next
  );
  return prisma.gameState.update({
    where: { id: state.id },
    data: {
      currentMatchday: next,
      matchdayType: resolvedType,
      gameStage: GameStage.ACTION,
    },
  });
}

/* RESULTS → STANDINGS → finalize */
export async function advanceAfterResults(saveGameId: number): Promise<void> {
  // Use the canonical setter so persistence + broadcast stay consistent
  await setStageForSave(saveGameId, GameStage.STANDINGS);
}

export async function finalizeStandings(
  saveGameId: number
): Promise<GameStateModel> {
  return finalizeStandingsAndAdvance(saveGameId);
}

/* ------------------------------------------------------------------ */
/* PENALTIES helpers                                                  */
/* ------------------------------------------------------------------ */

/** Returns whether the current schema supports the PENALTIES stage. */
export function supportsPenaltiesStage(): boolean {
  return STAGES_SET.has("PENALTIES");
}

/** Switch the active save to the PENALTIES stage and broadcast. */
export async function enterPenalties(saveGameId: number) {
  return setStageForSave(saveGameId, "PENALTIES");
}

/**
 * Exit the PENALTIES stage:
 * - by default goes to "RESULTS" (post-shootout flow),
 * - or to "MATCHDAY" if you want to resume live play (e.g., in-match single PK).
 */
export async function exitPenalties(
  saveGameId: number,
  opts?: { to?: "RESULTS" | "MATCHDAY" }
) {
  const target = opts?.to ?? "RESULTS";
  return setStageForSave(saveGameId, target);
}

export const initializeGameState = ensureGameState;
