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
      teamId: oldTeamIdToNew[p.teamId!],
      localIndex: p.localIndex,
    })),
  });

  // 4. Copy SaveGameMatches
  const oldMatches = await prisma.saveGameMatch.findMany({
    where: { saveGameId: currentSaveId },
  });

  for (const match of oldMatches) {
    await prisma.saveGameMatch.create({
      data: {
        saveGameId: newSave.id,
        homeTeamId: oldTeamIdToNew[match.homeTeamId],
        awayTeamId: oldTeamIdToNew[match.awayTeamId],
        played: match.played,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        matchdayId: match.matchdayId,
        matchdayType: match.matchdayType,
        matchDate: match.matchDate, // ✅ FIXED: Required by schema
      },
    });
  }

  return newSave.id;
}
