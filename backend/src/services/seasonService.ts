import prisma from '../utils/prisma';
import { SaveGameTeam } from '@prisma/client';
import { generateFullSeason } from './fixtureServices';

/**
 * Generate and persist all fixtures (league & cup) for the given save game.
 * Also initializes the league table.
 * @param saveGameId ID of the active save game
 */
export async function scheduleSeason(saveGameId: number, teams: SaveGameTeam[]) {
  await generateFullSeason(saveGameId, teams);
}

/**
 * Initialize league table entries for any missing teams.
 * @param saveGameId ID of the active save game
 */
export async function initializeLeagueTable(saveGameId: number): Promise<void> {
  const teams = await prisma.saveGameTeam.findMany({
    where: { saveGameId },
    select: { id: true },
  });

  for (const { id: teamId } of teams) {
    await prisma.leagueTable.upsert({
      where: { teamId },
      update: {},
      create: { teamId },
    });
  }
}
