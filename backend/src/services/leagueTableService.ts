// src/services/leagueTableService.ts

import prisma from '../utils/prisma';

export async function updateLeagueTableForMatchday(matchdayId: number) {
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: {
      matches: true,
    },
  });

  if (!matchday || matchday.type !== 'LEAGUE') return;

  for (const match of matchday.matches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const homeGoals = match.homeScore;
    const awayGoals = match.awayScore;

    const homeResult = getResult(homeGoals, awayGoals);
    const awayResult = getResult(awayGoals, homeGoals);

    await upsertLeagueTable(match.homeTeamId, homeResult, homeGoals, awayGoals);
    await upsertLeagueTable(match.awayTeamId, awayResult, awayGoals, homeGoals);
  }
}

function getResult(goalsFor: number, goalsAgainst: number) {
  if (goalsFor > goalsAgainst) return 'win';
  if (goalsFor < goalsAgainst) return 'loss';
  return 'draw';
}

async function upsertLeagueTable(
  teamId: number,
  result: 'win' | 'draw' | 'loss',
  goalsFor: number,
  goalsAgainst: number
) {
  const existing = await prisma.leagueTable.findUnique({
    where: { teamId },
  });

  const updateData = {
    played: (existing?.played || 0) + 1,
    goalsFor: (existing?.goalsFor || 0) + goalsFor,
    goalsAgainst: (existing?.goalsAgainst || 0) + goalsAgainst,
    points: (existing?.points || 0) + (result === 'win' ? 3 : result === 'draw' ? 1 : 0),
    wins: (existing?.wins || 0) + (result === 'win' ? 1 : 0),
    draws: (existing?.draws || 0) + (result === 'draw' ? 1 : 0),
    losses: (existing?.losses || 0) + (result === 'loss' ? 1 : 0),
  };

  await prisma.leagueTable.upsert({
    where: { teamId },
    update: updateData,
    create: {
      teamId,
      ...updateData,
    },
  });
}
