// backend/src/tests/utils/cleanTestData.ts
import prisma from '@/utils/prisma';

export async function cleanTestData() {
  await prisma.matchEvent.deleteMany({});
  await prisma.matchState.deleteMany({});
  await prisma.saveGameMatch.deleteMany({});
  await prisma.saveGamePlayer.deleteMany({});
  await prisma.saveGameTeam.deleteMany({});
  await prisma.referee.deleteMany({});
  await prisma.gameState.deleteMany({});
  await prisma.saveGame.deleteMany({});
}
