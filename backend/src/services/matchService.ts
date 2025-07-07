import prisma from "../prisma/client";

export const simulateMatch = async (
  homeTeamId: number,
  awayTeamId: number,
  matchdayId: number
) => {
  // get both teams
  const homeTeam = await prisma.team.findUnique({
    where: { id: homeTeamId },
    include: { players: true },
  });
  const awayTeam = await prisma.team.findUnique({
    where: { id: awayTeamId },
    include: { players: true },
  });

  if (!homeTeam || !awayTeam) {
    throw new Error("Teams not found");
  }

  const homeStrength =
    homeTeam.players.reduce((sum, p) => sum + p.rating, 0) /
    homeTeam.players.length;

  const awayStrength =
    awayTeam.players.reduce((sum, p) => sum + p.rating, 0) /
    awayTeam.players.length;

  const homeScore = Math.max(
    0,
    Math.round(homeStrength / 20 + Math.random() * 2)
  );
  const awayScore = Math.max(
    0,
    Math.round(awayStrength / 20 + Math.random() * 2)
  );

  const match = await prisma.match.create({
    data: {
      homeTeamId,
      awayTeamId,
      homeScore,
      awayScore,
      matchDate: new Date(),
      season: 1,
      isPlayed: true,
      matchdayId,
    },
  });

  await prisma.team.update({
    where: { id: homeTeamId },
    data: { budget: { increment: homeScore > awayScore ? 5000 : 2000 } },
  });

  await prisma.team.update({
    where: { id: awayTeamId },
    data: { budget: { increment: awayScore > homeScore ? 5000 : 2000 } },
  });

  return match;
};
