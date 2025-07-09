// src/state/gameState.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GameState = {
  async get() {
    return prisma.gameState.findFirst();
  },

  async setStage(stage: string) {
    const current = await prisma.gameState.findFirst();
    if (!current) throw new Error('No GameState found');
    return prisma.gameState.update({
      where: { id: current.id },
      data: { gameStage: stage },
    });
  },

  async advanceStage() {
    const current = await this.get();
    if (!current) throw new Error('No GameState found');

    const stageFlow: Record<string, string> = {
      ACTION: 'MATCHDAY',
      MATCHDAY: 'HALFTIME',
      HALFTIME: 'RESULTS',
      RESULTS: 'STANDINGS',
      STANDINGS: 'ACTION',
    };

    const next = stageFlow[current.gameStage] || 'ACTION';

    return prisma.gameState.update({
      where: { id: current.id },
      data: { gameStage: next },
    });
  },

  async setMatchday(matchdayId: number, type: string) {
    const current = await this.get();
    if (!current) throw new Error('No GameState found');

    return prisma.gameState.update({
      where: { id: current.id },
      data: {
        currentMatchday: matchdayId,
        matchdayType: type,
      },
    });
  },

  async setCoachTeam(teamId: number) {
    const current = await this.get();
    if (!current) throw new Error('No GameState found');

    return prisma.gameState.update({
      where: { id: current.id },
      data: {
        coachTeamId: teamId,
      },
    });
  },
};
