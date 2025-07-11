// src/services/newGameService.ts

import prisma from '../utils/prisma';
import {
  assignTeamsToDivisions,
  TeamPoolEntry,
} from '../utils/divisionAssigner';
import { syncPlayersWithNewTeamRating } from '../utils/playerSync';
import { GameStage, MatchdayType, DivisionTier } from '@prisma/client';

export interface NewGameResult {
  saveGameId: number;
  coachTeamId: number;
  userTeamName: string;
  divisionPreview: string[];
}

/**
 * Starts a brand-new game:
 * 1. Loads base teams from the selected countries (must be ≥128).
 * 2. Assigns 32 teams into D1–D4 via `assignTeamsToDivisions`.
 * 3. Creates a SaveGame and its SaveGameTeam / SaveGamePlayer entries.
 * 4. Syncs player ratings/salaries via `syncPlayersWithNewTeamRating`.
 * 5. Picks a random coach team from Division 4.
 * 6. Initializes GameState for that save.
 *
 * @param selectedCountries list of country names to draw teams from
 * @returns IDs and summary of the new game setup
 */
export async function startNewGame(
  selectedCountries: string[]
): Promise<NewGameResult> {
  // 1. Load and validate base teams
  const baseTeams = await prisma.baseTeam.findMany({
    where: { country: { in: selectedCountries } },
    include: { players: true },
  });
  if (baseTeams.length < 128) {
    throw new Error('At least 128 clubs are required to start a new game.');
  }

  // 2. Build pool and assign to divisions
  const teamPool: TeamPoolEntry[] = baseTeams.map(t => ({
    id: t.id,
    name: t.name,
    country: t.country,
    baseRating: t.rating,
  }));
  const assignments = assignTeamsToDivisions(teamPool);

  // 3. Group baseTeams by division
  const divisionMap: Record<DivisionTier, typeof baseTeams> = {
    D1: [],
    D2: [],
    D3: [],
    D4: [],
  };
  for (const { teamId, division } of assignments) {
    const bt = baseTeams.find(t => t.id === teamId)!;
    divisionMap[division].push(bt);
  }

  // 4. Create SaveGame
  const saveGame = await prisma.saveGame.create({
    data: {
      name: `Save ${Date.now()}`,
      coachName: null,
    },
  });

  // 5. Create SaveGameTeam & SaveGamePlayer entries
  const saveTeamIds: Record<number, number> = {};
  for (const div of Object.values(DivisionTier)) {
    const teamsInDiv = divisionMap[div];
    for (let i = 0; i < teamsInDiv.length; i++) {
      const base = teamsInDiv[i];
      const saveTeam = await prisma.saveGameTeam.create({
        data: {
          saveGameId: saveGame.id,
          baseTeamId: base.id,
          name: base.name,
          division: div,
          morale: 75,
          currentSeason: 1,
          localIndex: i,
        },
      });
      saveTeamIds[base.id] = saveTeam.id;

      for (let j = 0; j < base.players.length; j++) {
        const p = base.players[j];
        await prisma.saveGamePlayer.create({
          data: {
            saveGameId: saveGame.id,
            basePlayerId: p.id,
            name: p.name,
            position: p.position,
            rating: 0,
            salary: 0,
            behavior: p.behavior,
            contractUntil: 1,
            teamId: saveTeam.id,
            localIndex: j,
          },
        });
      }
    }
  }

  // 6. Sync true ratings/salaries based on division assignments
  await syncPlayersWithNewTeamRating(saveGame.id, baseTeams, divisionMap);

  // 7. Pick a random coach team from Division 4
  const d4SaveTeamIds = divisionMap.D4.map(bt => saveTeamIds[bt.id]);
  const coachTeamId =
    d4SaveTeamIds[Math.floor(Math.random() * d4SaveTeamIds.length)];
  const userTeamName = divisionMap.D4.find(
    bt => saveTeamIds[bt.id] === coachTeamId
  )!.name;

  // 8. Initialize GameState
  await prisma.gameState.create({
    data: {
      currentSaveGameId: saveGame.id,
      coachTeamId,
      currentMatchday: 1,
      matchdayType: MatchdayType.LEAGUE,
      gameStage: GameStage.ACTION,
    },
  });

  // 9. Prepare a division preview for the frontend
  const divisionPreview = Object.entries(divisionMap).map(
    ([div, teams]) =>
      `${div}: ${teams.map(bt => saveTeamIds[bt.id]).join(', ')}`
  );

  return {
    saveGameId: saveGame.id,
    coachTeamId,
    userTeamName,
    divisionPreview,
  };
}
