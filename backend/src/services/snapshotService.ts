// backend/src/services/snapshotService.ts

import prisma from '../utils/prisma';

/**
 * Creates a full snapshot of the current save game, duplicating all teams,
 * players, and match data into a new SaveGame entry.
 */
export async function snapshotCurrentGame(): Promise<number> {
  const gameState = await prisma.gameState.findFirstOrThrow();
  const currentSaveId = gameState.currentSaveGameId;
  if (!currentSaveId) throw new Error('No active save game to snapshot');

  const coachTeamId = gameState.coachTeamId;
  const timestamp = new Date().toISOString();
  const autoName = `Manual Save ${timestamp}`;

  // 1. Create new SaveGame
  const newSave = await prisma.saveGame.create({
    data: {
      name: autoName,
      coachName: coachTeamId?.toString() ?? 'unknown',
    },
  });

  // 2. Copy SaveGameTeams
  const oldTeams = await prisma.saveGameTeam.findMany({
    where: { saveGameId: currentSaveId },
  });

  const oldTeamIdToNew: Record<number, number> = {};

  for (const team of oldTeams) {
    const newTeam = await prisma.saveGameTeam.create({
      data: {
        saveGameId: newSave.id,
        baseTeamId: team.baseTeamId,
        name: team.name,
        division: team.division,
        morale: team.morale,
        currentSeason: team.currentSeason,
        localIndex: team.localIndex,
        rating: team.rating,
      },
    });
    oldTeamIdToNew[team.id] = newTeam.id;
  }

  // 3. Copy SaveGamePlayers
  const oldPlayers = await prisma.saveGamePlayer.findMany({
    where: { saveGameId: currentSaveId },
  });

  await prisma.saveGamePlayer.createMany({
    data: oldPlayers.map((p) => ({
      saveGameId: newSave.id,
      basePlayerId: p.basePlayerId,
      name: p.name,
      position: p.position,
      rating: p.rating,
      salary: p.salary,
      behavior: p.behavior,
      contractUntil: p.contractUntil,
      teamId: p.teamId ? oldTeamIdToNew[p.teamId] ?? null : null,
      localIndex: p.localIndex,
    })),
  });

  // 4. Copy Matchdays so matches point at the cloned schedule
  const oldMatchdays = await prisma.matchday.findMany({
    where: { saveGameId: currentSaveId },
    select: {
      id: true,
      number: true,
      type: true,
      isPlayed: true,
      roundLabel: true,
      season: true,
    },
    orderBy: { id: 'asc' },
  });

  const matchdayIdMap: Record<number, number> = {};

  for (const md of oldMatchdays) {
    const newMd = await prisma.matchday.create({
      data: {
        saveGameId: newSave.id,
        number: md.number,
        type: md.type,
        isPlayed: md.isPlayed,
        roundLabel: md.roundLabel,
        season: md.season,
      },
    });
    matchdayIdMap[md.id] = newMd.id;
  }

  // 5. Copy SaveGameMatches with remapped foreign keys
  const oldMatches = await prisma.saveGameMatch.findMany({
    where: { saveGameId: currentSaveId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
      isPlayed: true,
      matchdayId: true,
    },
  });

  for (const match of oldMatches) {
    const newHomeTeamId = oldTeamIdToNew[match.homeTeamId];
    const newAwayTeamId = oldTeamIdToNew[match.awayTeamId];
    const newMatchdayId = matchdayIdMap[match.matchdayId];

    if (!newHomeTeamId || !newAwayTeamId || !newMatchdayId) {
      throw new Error('Failed to resolve cloned identifiers while snapshotting matches');
    }

    await prisma.saveGameMatch.create({
      data: {
        saveGameId: newSave.id,
        homeTeamId: newHomeTeamId,
        awayTeamId: newAwayTeamId,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        isPlayed: match.isPlayed,
        matchdayId: newMatchdayId,
      },
    });
  }

  return newSave.id;
}
