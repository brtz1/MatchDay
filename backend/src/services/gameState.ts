// src/services/gameState.ts

import prisma from '../utils/prisma';
import { GameStage, MatchdayType, GameState } from '@prisma/client';

/**
 * Fetches the full current GameState, including the coach team relation.
 * @throws if no GameState record exists.
 */
export async function getGameState(): Promise<GameState & { coachTeam: { id: number; name: string } }> {
  const state = await prisma.gameState.findFirst({
    include: { coachTeam: true },
  });
  if (!state) throw new Error('GameState not initialized');
  return state;
}

/**
 * Returns the active saveGameId from GameState.
 * @throws if GameState does not exist or saveGameId is not set.
 */
export async function getCurrentSaveGameId(): Promise<number> {
  const state = await prisma.gameState.findFirst();
  if (!state || !state.currentSaveGameId) {
    throw new Error('No active save game');
  }
  return state.currentSaveGameId;
}

/**
 * Updates the gameStage in GameState.
 * Accepts either a GameStage enum or its string key.
 */
export async function setGameStage(stage: GameStage | string): Promise<GameState> {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  let nextStage: GameStage;
  if (typeof stage === 'string') {
    if (!(stage in GameStage)) {
      throw new Error(`Invalid GameStage "${stage}"`);
    }
    nextStage = GameStage[stage as keyof typeof GameStage];
  } else {
    nextStage = stage;
  }

  return prisma.gameState.update({
    where: { id: current.id },
    data: { gameStage: nextStage },
  });
}

/**
 * Updates the matchdayType in GameState.
 * Accepts either a MatchdayType enum or its string key.
 */
export async function setMatchdayType(type: MatchdayType | string): Promise<GameState> {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  let nextType: MatchdayType;
  if (typeof type === 'string') {
    if (!(type in MatchdayType)) {
      throw new Error(`Invalid MatchdayType "${type}"`);
    }
    nextType = MatchdayType[type as keyof typeof MatchdayType];
  } else {
    nextType = type;
  }

  return prisma.gameState.update({
    where: { id: current.id },
    data: { matchdayType: nextType },
  });
}

/**
 * Returns the current matchdayType.
 * @throws if GameState is not initialized.
 */
export async function getMatchdayType(): Promise<MatchdayType> {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');
  return current.matchdayType;
}

/**
 * Increments currentMatchday by 1 and resets gameStage to ACTION.
 * @throws if GameState is not initialized.
 */
export async function advanceToNextMatchday(): Promise<GameState> {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      currentMatchday: current.currentMatchday + 1,
      gameStage: GameStage.ACTION,
    },
  });
}

/**
 * Sets the current save game.
 * @throws if GameState is not initialized.
 */
export async function setCurrentSaveGame(saveGameId: number): Promise<GameState> {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  return prisma.gameState.update({
    where: { id: current.id },
    data: { currentSaveGameId: saveGameId },
  });
}

/**
 * Sets the coached team for the session.
 * @throws if GameState is not initialized.
 */
export async function setCoachTeam(coachTeamId: number): Promise<GameState> {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  return prisma.gameState.update({
    where: { id: current.id },
    data: { coachTeamId },
  });
}

/**
 * Ensures a GameState record exists on application startup.
 * If none exists, creates one with default values.
 */
export async function initializeGameState(): Promise<void> {
  const existing = await prisma.gameState.findFirst();
  if (!existing) {
    await prisma.gameState.create({
      data: {
        currentSaveGameId: 0,
        coachTeamId: 0,
        currentMatchday: 1,
        matchdayType: MatchdayType.LEAGUE,
        gameStage: GameStage.ACTION,
      },
    });
  }
}
