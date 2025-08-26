// backend/src/services/moraleContractService.ts

import prisma from '../utils/prisma';
import { runAuction, TeamAuctionEntry } from '../utils/auction';
import { SaveGamePlayer } from '@prisma/client';

/**
 * After a matchday, adjust morale and handle player contract renewals or auctions.
 *
 * @param saveGameId – ID of the save game
 * @param matchdayId – ID of the matchday just simulated
 */
export async function updateMoraleAndContracts(
  saveGameId: number,
  matchdayId: number
): Promise<void> {
  // 1. Load completed matches for this save game & matchday
  const matches = await prisma.saveGameMatch.findMany({
    where: {
      matchdayId,
      saveGameId,
      AND: [{ homeGoals: { gte: 0 } }, { awayGoals: { gte: 0 } }],
    },
  });

  // 2. Compute results per team
  const resultsByTeam: Record<number, 'win' | 'draw' | 'loss'> = {};
  for (const m of matches) {
    const { homeTeamId, awayTeamId, homeGoals, awayGoals } = m;
    if (homeGoals == null || awayGoals == null) continue;
    if (homeGoals > awayGoals) {
      resultsByTeam[homeTeamId] = 'win';
      resultsByTeam[awayTeamId] = 'loss';
    } else if (homeGoals < awayGoals) {
      resultsByTeam[homeTeamId] = 'loss';
      resultsByTeam[awayTeamId] = 'win';
    } else {
      resultsByTeam[homeTeamId] = resultsByTeam[awayTeamId] = 'draw';
    }
  }

  // 3. For each team, update morale and process players
  for (const [teamIdStr, result] of Object.entries(resultsByTeam)) {
    const teamId = Number(teamIdStr);

    // 3a. Update coach/team morale
    const saveTeam = await prisma.saveGameTeam.findFirst({
      where: { id: teamId, saveGameId },
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
    const players: SaveGamePlayer[] = await prisma.saveGamePlayer.findMany({
      where: { teamId, saveGameId },
    });

    // 3c. Process each player
    for (const player of players) {
      const fairSalary = player.rating * 40;
      const underpaid = player.salary < fairSalary;
      const skipRenew = newMorale < 40 && underpaid && Math.random() < 0.5;

      if (!skipRenew) {
        // Renew contract
        const newSalary = calculateSalary(player.rating, player.behavior);
        await prisma.saveGamePlayer.update({
          where: { id: player.id },
          data: {
            salary: newSalary,
            contractUntil: (player.contractUntil ?? 1) + 1,
          },
        });
      } else {
        // Auction the player
        const candidates = await loadCandidateTeams(saveGameId, teamId);
        const winnerTeamId = runAuction(
          {
            id: player.id,
            rating: player.rating,
            behavior: player.behavior,
            salary: player.salary,
          },
          candidates
        );

        if (winnerTeamId) {
          await prisma.saveGamePlayer.update({
            where: { id: player.id },
            data: {
              teamId: winnerTeamId,
              salary: calculateSalary(player.rating, player.behavior),
              contractUntil: 1,
            },
          });
        } else {
          await prisma.saveGamePlayer.update({
            where: { id: player.id },
            data: {
              contractUntil: (player.contractUntil ?? 1) + 1,
            },
          });
        }
      }
    }
  }
}

/**
 * Builds the list of other teams (with morale & player ratings) for use in auctions.
 */
async function loadCandidateTeams(
  saveGameId: number,
  excludeTeamId: number
): Promise<TeamAuctionEntry[]> {
  const teams = await prisma.saveGameTeam.findMany({
    where: {
      id: { not: excludeTeamId },
      saveGameId,
    },
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

/**
 * Simple salary formula.
 */
function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  const factor = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * factor);
}
