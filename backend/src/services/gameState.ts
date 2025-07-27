// backend/src/services/gameState.ts

import prisma from "../utils/prisma";
import {
  GameStage,
  MatchdayType,
  GameState as GameStateModel,
} from "@prisma/client";
import { advanceMatchday } from "./matchdayService";

/* ---------------------------------------------------------------- helpers */

/** Returns a default GameState object when none exists */
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

/* ---------------------------------------------------------------- public API */

/**
 * Only returns existing game state, or null.
 * Used for: frontend startup, Title Page detection
 */
export async function getGameState(): Promise<GameStateModel | null> {
  return await prisma.gameState.findFirst({
    include: { coachTeam: true },
  });
}

/**
 * Forces game state to exist — used when starting or loading a game.
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

export async function advanceStage() {
  const current = await ensureGameState();
  const flow: Record<GameStage, GameStage> = {
    ACTION: GameStage.MATCHDAY,
    MATCHDAY: GameStage.HALFTIME,
    HALFTIME: GameStage.RESULTS,
    RESULTS: GameStage.STANDINGS,
    STANDINGS: GameStage.ACTION,
  };
  return prisma.gameState.update({
    where: { id: current.id },
    data: { gameStage: flow[current.gameStage] },
  });
}

export async function setMatchday(
  matchdayId: number,
  type: MatchdayType | string,
) {
  const current = await ensureGameState();
  const next =
    typeof type === "string"
      ? (MatchdayType[type as keyof typeof MatchdayType] ?? MatchdayType.LEAGUE)
      : type;

  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      currentMatchday: matchdayId,
      matchdayType: next,
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

  // Prevent overwriting once a coach team has been assigned
  if (current.coachTeamId !== null && current.coachTeamId !== undefined) {
    console.warn("🛑 Coach team already set — skipping overwrite.");
    return current;
  }

  return prisma.gameState.update({
    where: { id: current.id },
    data: { coachTeamId },
  });
}


/* ---------------------------------------------------------------- matchday flow */

export async function advanceToNextMatchday() {
  const state = await ensureGameState();
  const nextMatchday = state.currentMatchday + 1;
  const nextType = getMatchdayTypeForNumber(nextMatchday);

  return prisma.gameState.update({
    where: { id: state.id },
    data: {
      currentMatchday: nextMatchday,
      matchdayType: nextType,
      gameStage: GameStage.ACTION,
    },
  });
}

export async function advanceAfterResults(coachTeamId: number): Promise<void> {
  const state = await ensureGameState();

  // Step 1: Show standings
  await prisma.gameState.update({
    where: { id: state.id },
    data: { gameStage: GameStage.STANDINGS },
  });

  // Step 2: Wait 30s before continuing
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Step 3: Simulate next matchday
  await advanceMatchday(state.currentSaveGameId);

  // Step 4: Back to action phase
  await prisma.gameState.update({
    where: { id: state.id },
    data: { gameStage: GameStage.ACTION },
  });
}

/* ---------------------------------------------------------------- alias */

export const initializeGameState = ensureGameState;
