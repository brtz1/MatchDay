import prisma from '../utils/prisma';
import { assignTeamsToDivisions } from '../utils/divisionAssigner';
import { syncPlayersWithNewTeamRating } from '../utils/playerSync';
import { GameStage, MatchdayType } from '@prisma/client';
import { DivisionTier } from '@prisma/client';


interface TeamPoolEntry {
  id: number;
  name: string;
  country: string;
  baseRating: number;
}

/**
 * Create a new save game from selected countries and assign all teams
 */
export async function startNewGame(selectedCountries: string[]) {
  const baseTeams = await prisma.baseTeam.findMany({
    where: { country: { in: selectedCountries } },
    include: { players: true },
  });

  if (baseTeams.length < 128) {
    throw new Error('At least 128 clubs are required to start a new game.');
  }

  // Step 1: Prepare teams and assign divisions
  const teamPool: TeamPoolEntry[] = baseTeams.map(baseTeams => ({
    id: baseTeams.id,
    name: baseTeams.name,
    country: baseTeams.country,
    baseRating: baseTeams.rating,
  }));

  const divisionAssignments = assignTeamsToDivisions(teamPool); // 32 teams assigned
  const divisionMap: Record<string, { id: number }[]> = {};

for (const assignment of divisionAssignments) {
  const divisionKey = `D${assignment.division}`;
  if (!divisionMap[divisionKey]) {
    divisionMap[divisionKey] = [];
  }
  divisionMap[divisionKey].push({ id: assignment.teamId });
}

// Step 2: Create SaveGame
const saveGame = await prisma.saveGame.create({
  data: { name: 'AutoSave', coachName: 'Coach' },
});

  const saveGameTeamIds: number[] = [];

  // Step 3: Create SaveGameTeams and SaveGamePlayers
  for (const assignment of divisionAssignments) {
    const baseTeam = baseTeams.find(saveGameTeamIds => saveGameTeamIds.id === assignment.teamId);
    if (!baseTeam) continue;

    const divisionName = `D${assignment.division}` as DivisionTier;
    const saveTeam = await prisma.saveGameTeam.create({
      data: {
        saveGameId: saveGame.id,
        name: baseTeam.name,
        morale: 50,
        baseTeamId: baseTeam.id,
        currentSeason: 1,
        division: divisionName as DivisionTier,
      },
    });

    saveGameTeamIds.push(saveTeam.id);

    for (const player of baseTeam.players) {
      await prisma.saveGamePlayer.create({
        data: {
          saveGameId: saveGame.id,
          teamId: saveTeam.id,
          basePlayerId: player.id,
          name: player.name,
          position: player.position,
          rating: 0,
          salary: 0,
          behavior: player.behavior ?? 3,
          contractUntil: 1,
        },
      });
    }
  }

  // Step 4: Sync player ratings/salaries based on team/division
  await syncPlayersWithNewTeamRating(saveGame.id, baseTeams, divisionMap);

  // Step 5: Pick user team from Division 4
  const d4Teams = await prisma.saveGameTeam.findMany({
    where: {
      saveGameId: saveGame.id,
      division: 'D4',
    },
  });

  const coachTeam = d4Teams[Math.floor(Math.random() * d4Teams.length)];
  if (!coachTeam) throw new Error('No team available in Division 4');

  // Step 6: Create GameState and assign coach team
  await prisma.gameState.create({
    data: {
      currentSaveGameId: saveGame.id,
      coachTeamId: coachTeam.id,
      gameStage: GameStage.ACTION,
      matchdayType: MatchdayType.LEAGUE,
      currentMatchday: 1,
    },
  });

  return coachTeam;
}
