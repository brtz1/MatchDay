// src/services/moraleContractService.ts

import prisma from '../utils/prisma';
import { handleAuction } from './auctionService';

export async function updateMoraleAndContracts(matchdayId: number) {
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: {
      matches: true,
    },
  });

  if (!matchday) return;

  const resultsByTeam: Record<number, 'win' | 'draw' | 'loss'> = {};

  for (const match of matchday.matches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const home = match.homeTeamId;
    const away = match.awayTeamId;

    if (match.homeScore > match.awayScore) {
      resultsByTeam[home] = 'win';
      resultsByTeam[away] = 'loss';
    } else if (match.homeScore < match.awayScore) {
      resultsByTeam[home] = 'loss';
      resultsByTeam[away] = 'win';
    } else {
      resultsByTeam[home] = 'draw';
      resultsByTeam[away] = 'draw';
    }
  }

  for (const [teamIdStr, result] of Object.entries(resultsByTeam)) {
    const teamId = parseInt(teamIdStr);
    const coach = await prisma.coach.findUnique({ where: { teamId } });
    if (!coach) continue;

    const moraleShift = result === 'win' ? 5 : result === 'loss' ? -5 : -1;
    const newMorale = Math.max(0, Math.min(100, coach.morale + moraleShift));

    await prisma.coach.update({
      where: { id: coach.id },
      data: { morale: newMorale },
    });

    const players = await prisma.player.findMany({ where: { teamId } });

    for (const player of players) {
      const underpaid = player.salary < player.rating * 40;
      const shouldRenew = !(newMorale < 40 && underpaid && Math.random() > 0.5);

      if (shouldRenew) {
        const newSalary = calculateSalary(player.rating, player.behavior);
        await prisma.player.update({
          where: { id: player.id },
          data: {
            salary: newSalary,
            contractUntil: (player.contractUntil ?? 1) + 1,
            lockedUntilNextMatchday: false,
          },
        });
      } else {
        const newTeamId = await handleAuction(player);

        if (newTeamId) {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              teamId: newTeamId,
              salary: calculateSalary(player.rating, player.behavior),
              contractUntil: 1,
              lockedUntilNextMatchday: false,
            },
          });
        } else {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              contractUntil: (player.contractUntil ?? 1) + 1,
              lockedUntilNextMatchday: true,
            },
          });
        }
      }
    }
  }
}

function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  const penalty = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1;
  return Math.round(base * penalty);
}
