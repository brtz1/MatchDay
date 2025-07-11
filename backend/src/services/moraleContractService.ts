// src/services/moraleContractService.ts

import prisma from '../utils/prisma';
import { runAuction, TeamAuctionEntry } from '../utils/auction';
import { Player } from '@prisma/client';

/**
 * After a matchday, adjust coach morale and handle player contract renewals or auctions.
 *
 * @param matchdayId – the ID of the Matchday just simulated
 */
export async function updateMoraleAndContracts(
  matchdayId: number
): Promise<void> {
  // 1. Load matchday with its matches
  const matchday = await prisma.matchday.findUnique({
    where: { id: matchdayId },
    include: { matches: true },
  });
  if (!matchday) throw new Error(`Matchday ${matchdayId} not found`);

  // 2. Compute results per team
  const resultsByTeam: Record<number, 'win' | 'draw' | 'loss'> = {};
  for (const m of matchday.matches) {
    const { homeTeamId, awayTeamId, homeScore, awayScore } = m;
    if (homeScore == null || awayScore == null) continue;
    if (homeScore > awayScore) {
      resultsByTeam[homeTeamId] = 'win';
      resultsByTeam[awayTeamId] = 'loss';
    } else if (homeScore < awayScore) {
      resultsByTeam[homeTeamId] = 'loss';
      resultsByTeam[awayTeamId] = 'win';
    } else {
      resultsByTeam[homeTeamId] = resultsByTeam[awayTeamId] = 'draw';
    }
  }

  // 3. For each team, update morale and then process their players
  for (const [teamIdStr, result] of Object.entries(resultsByTeam)) {
    const teamId = Number(teamIdStr);

    // 3a. Update coach morale (stored on SaveGameTeam.morale)
    const saveTeam = await prisma.saveGameTeam.findUnique({
      where: { id: teamId },
      select: { morale: true, id: true },
    });
    let newMorale = saveTeam?.morale ?? 75;
    if (saveTeam) {
      const delta = result === 'win' ? 5 : result === 'loss' ? -5 : -1;
      newMorale = Math.max(0, Math.min(100, saveTeam.morale + delta));
      await prisma.saveGameTeam.update({
        where: { id: teamId },
        data: { morale: newMorale },
      });
    }

    // 3b. Load players of that team
    const players: Player[] = await prisma.player.findMany({
      where: { teamId },
    });

    // 3c. Process each player
    for (const player of players) {
      const fairSalary = player.rating * 40;
      const underpaid = player.salary < fairSalary;
      const skipRenew =
        newMorale < 40 && underpaid && Math.random() < 0.5;

      if (!skipRenew) {
        // Renew contract
        const newSalary = calculateSalary(
          player.rating,
          player.behavior
        );
        await prisma.player.update({
          where: { id: player.id },
          data: {
            salary: newSalary,
            contractUntil: (player.contractUntil ?? 1) + 1,
            lockedUntilNextMatchday: false,
          },
        });
      } else {
        // Auction the player
        const candidates = await loadCandidateTeams(teamId);
        const winnerTeamId = runAuction(player, candidates);
        if (winnerTeamId) {
          // Transfer to winning team
          await prisma.player.update({
            where: { id: player.id },
            data: {
              teamId: winnerTeamId,
              salary: calculateSalary(
                player.rating,
                player.behavior
              ),
              contractUntil: 1,
              lockedUntilNextMatchday: false,
            },
          });
        } else {
          // Lock if no bids
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

/**
 * Builds the list of other teams (with morale & player ratings)
 * for use in auctions.
 */
async function loadCandidateTeams(
  excludeTeamId: number
): Promise<TeamAuctionEntry[]> {
  const teams = await prisma.saveGameTeam.findMany({
    where: { id: { not: excludeTeamId } },
    include: {
      players: { select: { id: true, rating: true } },
    },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    coach: { morale: t.morale },
    players: t.players.map((p) => ({
      id: p.id,
      rating: p.rating,
    })),
  }));
}

/** Simple salary formula */
function calculateSalary(
  rating: number,
  behavior: number
): number {
  const base = rating * 50;
  const factor =
    behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * factor);
}
