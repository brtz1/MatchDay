import { PrismaClient, GameStage, MatchdayType } from '@prisma/client';

const prisma = new PrismaClient();

export const GameState = {
  async get() {
    return prisma.gameState.findFirst();
  },

  async setStage(stage: GameStage | string) {
    const current = await prisma.gameState.findFirst();
    if (!current) throw new Error('No GameState found');

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
      data: { gameStage: { set: enumStage } },
    });
  },

  async advanceStage() {
    const current = await this.get();
    if (!current) throw new Error('No GameState found');

    const stageFlow: Record<GameStage, GameStage> = {
      ACTION: GameStage.MATCHDAY,
      MATCHDAY: GameStage.HALFTIME,
      HALFTIME: GameStage.RESULTS,
      RESULTS: GameStage.STANDINGS,
      STANDINGS: GameStage.ACTION,
    };

    const next: GameStage = stageFlow[current.gameStage];

    return prisma.gameState.update({
      where: { id: current.id },
      data: { gameStage: { set: next } },
    });
  },

  async setMatchday(matchdayId: number, type: MatchdayType | string) {
    const current = await this.get();
    if (!current) throw new Error('No GameState found');

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
        currentMatchday: matchdayId,
        matchdayType: { set: enumType },
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
