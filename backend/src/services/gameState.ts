// backend/src/services/gameState.ts

import prisma from "../utils/prisma";
import {
  GameStage,
  MatchdayType,
  GameState as GameStateModel,
} from "@prisma/client";

// Use the new finalize helper after the Standings grace:
import { finalizeStandingsAndAdvance } from "./matchdayService";

/* ---------------------------------------------------------------- helpers */

/** Returns a default GameState object when none exists */
function defaultData(): Omit<GameStateModel, "id"> {
  return {
    season:            1,
    coachTeamId:       null,
    currentSaveGameId: 0,
    currentMatchday:   1,
    matchdayType:      MatchdayType.LEAGUE,
    gameStage:         GameStage.ACTION,
  };
}

function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday)
    ? MatchdayType.CUP
    : MatchdayType.LEAGUE;
}

/* ---------------------------------------------------------------- public API */

/**
 * Only returns the existing GameState (with coachTeam relation), or null.
 * Used on front-end startup to know where we left off.
 */
export async function getGameState(): Promise<GameStateModel | null> {
  return prisma.gameState.findFirst({
    include: { coachTeam: true },
  });
}

/**
 * Ensures a GameState row exists. If `update.saveGameId` is given,
 * sets that on first create or on update.
 */
export async function ensureGameState(update?: { saveGameId?: number }) {
  let state = await prisma.gameState.findFirst();
  if (!state) {
    state = await prisma.gameState.create({
      data: {
        ...defaultData(),
        currentSaveGameId: update?.saveGameId ?? 0,
      },
    });
  } else if (update?.saveGameId !== undefined) {
    state = await prisma.gameState.update({
      where: { id: state.id },
      data: { currentSaveGameId: update.saveGameId },
    });
  }
  return state;
}

export async function getCurrentSaveGameId(): Promise<number | null> {
  const state = await getGameState();
  return state?.currentSaveGameId ?? null;
}

export async function getCoachTeamId(): Promise<number | null> {
  const state = await getGameState();
  return state?.coachTeamId ?? null;
}

/* ---------------------------------------------------------------- mutators */

/** Set gameStage explicitly (e.g. from front-end) */
export async function setGameStage(stage: GameStage | string) {
  const current = await ensureGameState();
  const next =
    typeof stage === "string"
      ? (GameStage[stage as keyof typeof GameStage] ?? GameStage.ACTION)
      : stage;
  return prisma.gameState.update({
    where: { id: current.id },
    data: { gameStage: next },
  });
}

/** Cycle through stages in pre-defined order */
export async function advanceStage() {
  const current = await ensureGameState();
  const flow: Record<GameStage, GameStage> = {
    ACTION:    GameStage.MATCHDAY,
    MATCHDAY:  GameStage.HALFTIME,
    HALFTIME:  GameStage.RESULTS,
    RESULTS:   GameStage.STANDINGS,
    STANDINGS: GameStage.ACTION,
  };
  return prisma.gameState.update({
    where: { id: current.id },
    data: { gameStage: flow[current.gameStage] },
  });
}

/** Directly set matchday number & type (does *not* touch gameStage) */
export async function setMatchday(
  matchdayNumber: number,
  type: MatchdayType | string
) {
  const current = await ensureGameState();
  const next =
    typeof type === "string"
      ? (MatchdayType[type as keyof typeof MatchdayType] ?? MatchdayType.LEAGUE)
      : type;
  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      currentMatchday: matchdayNumber,
      matchdayType:    next,
    },
  });
}

export async function setCurrentSaveGame(saveGameId: number) {
  const current = await ensureGameState();
  return prisma.gameState.update({
    where: { id: current.id },
    data: { currentSaveGameId: saveGameId },
  });
}

export async function setCoachTeam(coachTeamId: number) {
  const current = await ensureGameState();
  if (current.coachTeamId !== null) {
    console.warn("🛑 Coach team already set — skipping overwrite.");
    return current;
  }
  return prisma.gameState.update({
    where: { id: current.id },
    data: { coachTeamId },
  });
}

/* ---------------------------------------------------------------- matchday flow */

/**
 * Manually bump matchday (no simulation), resetting to ACTION.
 * Useful if you want to skip cup rounds or force-advance.
 */
export async function advanceToNextMatchday() {
  const state = await ensureGameState();
  const next = state.currentMatchday + 1;
  return prisma.gameState.update({
    where: { id: state.id },
    data: {
      currentMatchday: next,
      matchdayType:    getMatchdayTypeForNumber(next),
      gameStage:       GameStage.ACTION,
    },
  });
}

/**
 * RESULTS → STANDINGS.
 * We no longer block with a server-side timer or auto-start the next matchday here.
 * Frontend shows the Standings Page with its own grace timer.
 * After grace, FE should call POST /matchday/finalize-standings,
 * which invokes finalizeStandingsAndAdvance(saveGameId) to:
 *   - increment currentMatchday (or reset season), and
 *   - set gameStage back to ACTION.
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
}


/**
 * Helper the backend (or a route) can call after the Standings grace:
 * runs finalizeStandingsAndAdvance(saveGameId) to move to next day (or new season)
 * and return the updated GameState.
 */
export async function finalizeStandings(saveGameId: number): Promise<GameStateModel> {
  return finalizeStandingsAndAdvance(saveGameId);
}

/* ---------------------------------------------------------------- alias */

export const initializeGameState = ensureGameState;
