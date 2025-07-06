import prisma from '../utils/prisma';

// Round-robin schedule generator
export const scheduleSeason = async () => {
  const teams = await prisma.team.findMany();
  const matches: { homeTeamId: number, awayTeamId: number }[] = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i !== j) {
        matches.push({
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id
        });
      }
    }
  }
  return matches;
};

export const initializeLeagueTable = async () => {
  const teams = await prisma.team.findMany();
  for (const team of teams) {
    await prisma.leagueTable.upsert({
      where: { teamId: team.id },
      update: {},
      create: {
        teamId: team.id
      }
    });
  }
};