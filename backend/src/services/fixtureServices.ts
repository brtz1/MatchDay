// src/services/fixtureService.ts
import prisma from '../utils/prisma';

const CUP_ROUND_NAMES = [
  'Round of 128',
  'Round of 64',
  'Round of 32',
  'Round of 16',
  'Quarterfinal',
  'Semifinal',
  'Final',
];

export async function generateLeagueFixtures(season: number) {
  const divisions = await prisma.division.findMany({
    include: {
      teams: true,
    },
  });

  for (const division of divisions) {
    const teamIds = division.teams.map((team) => team.id);
    const fixtures = createDoubleRoundRobinFixtures(teamIds);

    for (let i = 0; i < fixtures.length; i++) {
      const matchday = await prisma.matchday.create({
        data: {
          number: i + 1,
          type: 'LEAGUE',
          date: new Date(),
        },
      });

      for (const [home, away] of fixtures[i]) {
        await prisma.match.create({
          data: {
            homeTeamId: home,
            awayTeamId: away,
            matchdayId: matchday.id,
            season,
            matchDate: new Date(),
          },
        });
      }
    }
  }
}

export async function generateCupFixtures(season: number) {
  const teams = await prisma.team.findMany();
  const shuffled = teams.sort(() => Math.random() - 0.5);
  let roundTeams = shuffled.map((team) => team.id);

  for (let round = 0; round < 7; round++) {
    const roundName = CUP_ROUND_NAMES[round];

    const matchday = await prisma.matchday.create({
      data: {
        number: round + 1,
        type: 'CUP',
        date: new Date(),
      },
    });

    const roundMatches: [number, number][] = [];

    for (let i = 0; i < roundTeams.length; i += 2) {
      const home = roundTeams[i];
      const away = roundTeams[i + 1];
      roundMatches.push([home, away]);

      await prisma.match.create({
        data: {
          homeTeamId: home,
          awayTeamId: away,
          matchdayId: matchday.id,
          season,
          matchDate: new Date(),
        },
      });
    }

    roundTeams = roundMatches.map(([home, away]) =>
      Math.random() < 0.5 ? home : away
    );
  }
}

function createDoubleRoundRobinFixtures(teamIds: number[]): number[][][] {
  const firstLeg = createRoundRobinFixtures(teamIds);
  const secondLeg = firstLeg.map((round) =>
    round.map(([home, away]) => [away, home])
  );
  return [...firstLeg, ...secondLeg];
}

function createRoundRobinFixtures(teamIds: number[]): number[][][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(-1); // Bye week

  const totalRounds = teams.length - 1;
  const half = teams.length / 2;
  const schedule: number[][][] = [];

  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: number[][] = [];

    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      if (home !== -1 && away !== -1) roundMatches.push([home, away]);
    }

    teams.splice(1, 0, teams.pop()!);
    schedule.push(roundMatches);
  }

  return schedule;
}
