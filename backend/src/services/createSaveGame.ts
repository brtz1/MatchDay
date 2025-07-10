// src/services/createSaveGame.ts

import prisma from '../utils/prisma';
import { DivisionTier } from '@prisma/client';

export async function createSaveGame(name: string, coachName: string): Promise<number> {
  // Fetch all live teams (already generated from baseTeams)
  const teams = await prisma.team.findMany({
    include: {
      players: true,
      coach: true,
      division: true,
    },
  });

  const matches = await prisma.match.findMany();

  // Create saveGame entry
  const saveGame = await prisma.saveGame.create({
    data: {
      name,
      coachName,
    },
  });

  // Step 1: Create SaveGameTeams
  const saveTeamMap = new Map<number, number>(); // liveTeamId -> saveTeamId

  for (const team of teams) {
    const saveTeam = await prisma.saveGameTeam.create({
      data: {
        saveGameId: saveGame.id,
        baseTeamId: team.id, // from baseTeam originally
        name: team.name,
        division: (`D${team.division?.level || 4}`) as DivisionTier,
        morale: team.coach?.morale ?? 75,
        currentSeason: 1,
      },
    });

    saveTeamMap.set(team.id, saveTeam.id);
  }

  // Step 2: Create SaveGamePlayers
  for (const team of teams) {
    const saveTeamId = saveTeamMap.get(team.id);
    if (!saveTeamId) continue;

    for (const p of team.players) {
      await prisma.saveGamePlayer.create({
        data: {
          saveGameId: saveGame.id,
          basePlayerId: p.id,
          name: p.name,
          position: p.position,
          rating: p.rating,
          salary: p.salary,
          behavior: p.behavior,
          contractUntil: p.contractUntil ?? 1,
          teamId: saveTeamId,
        },
      });
    }
  }

  // Step 3: Create SaveGameMatches
  for (const match of matches) {
    await prisma.saveGameMatch.create({
      data: {
        saveGameId: saveGame.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        matchDate: match.matchDate,
        played: match.isPlayed,
      },
    });
  }

  return saveGame.id;
}
