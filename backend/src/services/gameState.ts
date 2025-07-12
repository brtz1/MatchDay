/** Central GameState service — compatible with BOTH old & new helpers */

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

/** Always returns a row (creates one if table empty) */
export async function ensureGameState(): Promise<GameStateModel> {
  return prisma.gameState.upsert({
    where: { id: 1 },
    create: { id: 1, ...defaultData() },
    update: {},
  });
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
      ? (MatchdayType[type as keyof typeof MatchdayType] ??
        MatchdayType.LEAGUE)
      : type;

  return prisma.gameState.update({
    where: { id: current.id },
    data: { currentMatchday: matchdayId, matchdayType: next },
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

export async function advanceToNextMatchday() {
  const state = await ensureGameState();
  return prisma.gameState.update({
    where: { id: state.id },
    data: {
      currentMatchday: state.currentMatchday + 1,
      gameStage: GameStage.ACTION,
    },
  });
}
