// backend/src/services/gameState.ts

import prisma from "@/utils/prisma";
import {
  GameStage,
  MatchdayType,
  GameState as GameStateModel,
} from "@prisma/client";

/* ---------------------------------------------------------------- helpers */

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

/** Determines whether a matchday is LEAGUE or CUP based on its number */
function getMatchdayTypeForNumber(matchday: number): MatchdayType {
  const cupDays = [3, 6, 8, 11, 14, 17, 20];
  return cupDays.includes(matchday) ? MatchdayType.CUP : MatchdayType.LEAGUE;
}

/** Always returns a row (creates one if table empty) */
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

/** Preferred getter (includes coachTeam relation) */
export async function getGameState() {
  const state = await prisma.gameState.findFirst({
    include: { coachTeam: true },
  });
  return state ?? (await ensureGameState());
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
  return prisma.gameState.update({
    where: { id: current.id },
    data: { coachTeamId },
  });
}

/* ---------------------------------------------------------------- legacy shims
   These keep older routes compiling without refactor */

export const initializeGameState = ensureGameState;

export async function getCurrentSaveGameId(): Promise<number> {
  const state = await ensureGameState();
  return state.currentSaveGameId;
}

/**
 * Advances to the next matchday, and updates its type (CUP or LEAGUE)
 */
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
