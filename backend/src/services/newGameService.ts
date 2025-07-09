// src/services/newGameService.ts

import prisma from '../utils/prisma';
import { assignTeamsToDivisions } from '../utils/divisionAssigner';
import { applyTeamRatingBasedOnDivision } from '../utils/teamRater';
import { syncPlayersWithNewTeamRating } from '../utils/playerSync';

interface TeamPoolEntry {
  id: number;
  name: string;
  country: string;
  baseRating: number;
}

export async function startNewGame(selectedCountries: string[]) {
  const baseTeams = await prisma.baseTeam.findMany({
    where: {
      country: { in: selectedCountries },
    },
    include: { players: true },
  });

  if (baseTeams.length < 128) {
    throw new Error('At least 128 clubs are required to start a new game.');
  }

  const teamPool: TeamPoolEntry[] = baseTeams.map((team) => ({
    id: team.id,
    name: team.name,
    country: team.country,
    baseRating: team.rating,
  }));

  const divisionAssignments = assignTeamsToDivisions(teamPool);

  // Clean previous game state (but not saves)
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.gameState.deleteMany();

  const saveGame = await prisma.saveGame.create({
    data: {
      name: 'AutoSave',
      coachName: 'Coach',
    },
  });

  const createdTeams = [];

  for (const assignment of divisionAssignments) {
    const baseTeam = baseTeams.find((t) => t.id === assignment.teamId);
    if (!baseTeam) continue;

    const division = await prisma.division.findFirst({
      where: { level: assignment.division },
    });
    if (!division) throw new Error(`Division ${assignment.division} not found`);

    const newRating = applyTeamRatingBasedOnDivision(assignment.division);

    const createdTeam = await prisma.team.create({
      data: {
        name: baseTeam.name,
        country: baseTeam.country,
        divisionId: division.id,
        rating: newRating,
      },
    });

    await syncPlayersWithNewTeamRating(
      createdTeam.id,
      baseTeam.players.map((p, i) => ({
        id: i + 1,
        name: p.name,
        nationality: p.nationality,
        position: p.position,
        rating: p.rating,
        salary: p.salary,
        behavior: p.behavior,
      })),
      newRating
    );

    createdTeams.push({ ...createdTeam, divisionLevel: assignment.division });
  }

  const d4Teams = createdTeams.filter((t) => t.divisionLevel === 4);
  const coachTeam = d4Teams[Math.floor(Math.random() * d4Teams.length)];
  if (!coachTeam) throw new Error('Failed to select coach team from Division 4');

  await prisma.gameState.create({
    data: {
      season: 1,
      currentMatchday: 1,
      matchdayType: 'LEAGUE',
      coachTeamId: coachTeam.id,
      gameStage: 'ACTION',
      currentSaveGameId: saveGame.id,
    },
  });

  return coachTeam;
}
