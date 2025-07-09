// src/services/gameStateService.ts

import prisma from '../utils/prisma';

/**
 * Get the current game state
 */
export async function getGameState() {
  return prisma.gameState.findFirst({
    include: {
      coachTeam: true,
    },
  });
}

/**
 * Set the current game stage (e.g., ACTION, MATCHDAY, etc.)
 */
export async function setGameStage(stage: 'ACTION' | 'MATCHDAY' | 'HALFTIME' | 'RESULTS' | 'STANDINGS') {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not initialized');

  return prisma.gameState.update({
    where: { id: current.id },
    data: { gameStage: stage },
  });
}

/**
 * Increment the matchday and reset stage to ACTION
 */
export async function advanceToNextMatchday() {
  const current = await prisma.gameState.findFirst();
  if (!current) throw new Error('GameState not found');

  return prisma.gameState.update({
    where: { id: current.id },
    data: {
      currentMatchday: current.currentMatchday + 1,
      gameStage: 'ACTION',
    },
  });
}
