// src/services/seasonService.ts

import prisma from '../utils/prisma';

/**
 * Represents a single fixture in the schedule.
 */
export interface Fixture {
  homeTeamId: number;
  awayTeamId: number;
}

/**
 * Generates a complete double round-robin schedule for all teams.
 * Each team plays every other team both home and away.
 *
 * @returns an array of Fixture objects
 */
export async function scheduleSeason(): Promise<Fixture[]> {
  const teams = await prisma.team.findMany({ select: { id: true } });
  const fixtures: Fixture[] = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue;
      fixtures.push({
        homeTeamId: teams[i].id,
        awayTeamId: teams[j].id,
      });
    }
  }

  return fixtures;
}

/**
 * Ensures there is a LeagueTable entry for every team.
 * Creates one if missing; otherwise does nothing.
 */
export async function initializeLeagueTable(): Promise<void> {
  const teams = await prisma.team.findMany({ select: { id: true } });

  for (const { id: teamId } of teams) {
    await prisma.leagueTable.upsert({
      where: { teamId },
      update: {}, // no changes if exists
      create: { teamId },
    });
  }
}
