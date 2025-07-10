import prisma from '../utils/prisma';
import { GameStage, MatchdayType } from '@prisma/client';

/**
 * Get the full current game state (with coach team)
 */
export async function getGameState() {
  const state = await prisma.gameState.findFirst({
    include: {
      coachTeam: true,
    },
  });

  if (!state) throw new Error('GameState not initialized');
  return state;
}

/**
 * Get just the current SaveGame ID
 */
export async function getCurrentSaveGameId(): Promise<number> {
  const state = await prisma.gameState.findFirst();
  if (!state?.currentSaveGameId) throw new Error('No active save game');
  return state.currentSaveGameId;
}

/**
 * Set the current game stage
 */
export async function setGameStage(stage: GameStage | string) {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  let enumStage: GameStage;
  if (typeof stage === 'string') {
    if (stage in GameStage) {
      enumStage = GameStage[stage as keyof typeof GameStage];
    } else {
      throw new Error(`Invalid GameStage string: ${stage}`);
    }
  } else {
    enumStage = stage;
  }

  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      gameStage: { set: enumStage as GameStage }
    },
  });
}

/**
 * Set the current matchday type (LEAGUE or CUP)
 */
export async function setMatchdayType(type: MatchdayType | string) {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  let enumType: MatchdayType;
  if (typeof type === 'string') {
    if (type in MatchdayType) {
      enumType = MatchdayType[type as keyof typeof MatchdayType];
    } else {
      throw new Error(`Invalid MatchdayType string: ${type}`);
    }
  } else {
    enumType = type;
  }

  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      matchdayType: { set: enumType as MatchdayType }
    },
  });
}

/**
 * Get the current matchday type
 */
export async function getMatchdayType(): Promise<MatchdayType> {
  const current = await prisma.gameState.findFirst();
  if (!current?.matchdayType) throw new Error('GameState not initialized');
  return current.matchdayType;
}

/**
 * Advance matchday and reset stage
 */
export async function advanceToNextMatchday() {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not found');

  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      currentMatchday: current.currentMatchday + 1,
      gameStage: { set: GameStage.ACTION },
    },
  });
}

/**
 * Set active save game
 */
export async function setCurrentSaveGame(saveGameId: number) {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  return prisma.gameState.update({
    where: { id: current.id },
    data: { currentSaveGameId: saveGameId },
  });
}

/**
 * Set coached team
 */
export async function setCoachTeam(coachTeamId: number) {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  return prisma.gameState.update({
    where: { id: current.id },
    data: { coachTeamId },
  });
}

/**
 * Initialize game state from scratch (used for fresh boots or resets)
 */
export async function initializeGameState(): Promise<void> {
  const exists = await prisma.gameState.findFirst();
  if (!exists) {
    await prisma.gameState.create({
      data: {
        currentSaveGameId: 0,
        coachTeamId: 0,
        gameStage: GameStage.ACTION,
        matchdayType: MatchdayType.LEAGUE,
        currentMatchday: 1,
      },
    });
  }
}
