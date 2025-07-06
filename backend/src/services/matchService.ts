import prisma from '../utils/prisma';
import { Team, Match, Referee } from '@prisma/client';

// Helper to calculate average rating of a team's players
const calculateTeamRating = (team: Team & { players: any[] }): number => {
  if (!team.players || team.players.length === 0) return 0;
  const total = team.players.reduce((sum, p) => sum + p.rating, 0);
  return Math.round(total / team.players.length);
};

// Simulate a match between two teams with a referee
const playMatch = async (
  homeTeam: Team & { players: any[] },
  awayTeam: Team & { players: any[] },
  referee: Referee
): Promise<Match> => {
  // Calculate team strengths (average player rating)
  const homeRating = calculateTeamRating(homeTeam);
  const awayRating = calculateTeamRating(awayTeam);

  // Apply referee influence: a very strict referee might reduce scoring a bit
  const strictFactor = 1 - referee.strictness * 0.02;  // e.g., strictness 10 => factor 0.8
  const adjHomeRating = homeRating * strictFactor;
  const adjAwayRating = awayRating * strictFactor;

  // Simple random match simulation for goals
  // Base chance proportional to team rating
  const homeScore = Math.max(0, Math.floor(Math.random() * (adjHomeRating / 10 + 1)));
  const awayScore = Math.max(0, Math.floor(Math.random() * (adjAwayRating / 10 + 1)));

  // Determine outcomes for finances
  let homePrize = 0;
  let awayPrize = 0;
  const ticketRevenue = 50000;  // fixed ticket income for home team
  if (homeScore > awayScore) {
    // Home wins
    homePrize = 100000;
    awayPrize = 20000;  // small consolation for away
  } else if (awayScore > homeScore) {
    // Away wins
    awayPrize = 100000;
    homePrize = 20000;  // small consolation for home (perhaps TV revenue)
  } else {
    // Draw
    homePrize = 50000;
    awayPrize = 50000;
  }

  // Prepare finance records and budget updates
  const financeOps: any[] = [];
  const teamOps: any[] = [];

  // Home team finance: ticket + prize (if any)
  const homeTotalGain = ticketRevenue + homePrize;
  financeOps.push(prisma.finance.create({
    data: {
      teamId: homeTeam.id,
      amount: ticketRevenue,
      type: 'INCOME',
      reason: 'Home match ticket sales',
    }
  }));
  if (homePrize > 0) {
    financeOps.push(prisma.finance.create({
      data: {
        teamId: homeTeam.id,
        amount: homePrize,
        type: 'INCOME',
        reason: homeScore >= awayScore ? 'Match win bonus' : 'Match draw bonus',
      }
    }));
  }
  teamOps.push(prisma.team.update({
    where: { id: homeTeam.id },
    data: { budget: { increment: homeTotalGain } }
  }));

  // Away team finance: prize (if any)
  if (awayPrize > 0) {
    financeOps.push(prisma.finance.create({
      data: {
        teamId: awayTeam.id,
        amount: awayPrize,
        type: 'INCOME',
        reason: awayScore > homeScore ? 'Match win bonus' : 'Match draw bonus',
      }
    }));
  }
  if (awayPrize > 0) {
    teamOps.push(prisma.team.update({
      where: { id: awayTeam.id },
      data: { budget: { increment: awayPrize } }
    }));
  }

  // Create match record and perform all DB operations in a transaction
  const [newMatch] = await prisma.$transaction([
    prisma.match.create({
      data: {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore,
        awayScore,
        matchDate: new Date(),
        season: 1,
        isPlayed: true,
      }
    }),
    ...financeOps,
    ...teamOps
  ]);

  return newMatch;
};

const getAllMatches = async (): Promise<Match[]> => {
  return prisma.match.findMany();
};

const getMatchById = async (id: number): Promise<Match | null> => {
  return prisma.match.findUnique({
    where: { id },
  });
};

export default {
  playMatch,
  getAllMatches,
  getMatchById,
};