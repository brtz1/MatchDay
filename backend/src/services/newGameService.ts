import prisma from "../utils/prisma";
import { GameStage, MatchdayType, DivisionTier } from "@prisma/client";
import { syncPlayersWithNewTeamRating } from "../utils/playerSync";

export interface NewGameResult {
  saveGameId: number;
  coachTeamId: number;
  userTeamName: string;
  divisionPreview: string[];
}

function generateTeamRatingForDivision(tier: DivisionTier): number {
  switch (tier) {
    case "D1": return Math.floor(Math.random() * 10) + 38;
    case "D2": return Math.floor(Math.random() * 13) + 28;
    case "D3": return Math.floor(Math.random() * 13) + 18;
    case "D4": return Math.floor(Math.random() * 13) + 8;
    case "DIST": return Math.floor(Math.random() * 8) + 1;
  }
}

export async function startNewGame(
  selectedCountries: string[],
): Promise<NewGameResult> {
  const baseTeams = await prisma.baseTeam.findMany({
    where: { country: { in: selectedCountries } },
    include: { players: true },
  });

  if (baseTeams.length < 128) {
    throw new Error("Need at least 128 clubs across chosen countries.");
  }

  const ordered = [...baseTeams].sort((a, b) => b.rating - a.rating);
  const divisionMap: Record<DivisionTier, typeof baseTeams> = {
    D1: ordered.slice(0, 8),
    D2: ordered.slice(8, 16),
    D3: ordered.slice(16, 24),
    D4: ordered.slice(24, 32),
    DIST: ordered.slice(32, 128),
  };

  const saveGame = await prisma.saveGame.create({
    data: { name: `Save ${Date.now()}`, coachName: null },
  });

  let idx = 0;
  const saveTeamIds: Record<number, number> = {};
  const saveGameTeams: {
    id: number;
    name: string;
    saveGameId: number;
    division: DivisionTier;
    localIndex: number;
    baseTeamId: number;
    morale: number;
    currentSeason: number;
    rating: number;
  }[] = [];

  for (const [tier, teams] of Object.entries(divisionMap) as [
    DivisionTier,
    typeof baseTeams,
  ][]) {
    for (const base of teams) {
      const rating = generateTeamRatingForDivision(tier);

      const saveTeam = await prisma.saveGameTeam.create({
        data: {
          saveGameId: saveGame.id,
          baseTeamId: base.id,
          name: base.name,
          division: tier,
          morale: 75,
          currentSeason: 1,
          localIndex: idx,
          rating,
        },
      });

      saveTeamIds[base.id] = saveTeam.id;
      saveGameTeams.push({
        id: saveTeam.id,
        name: saveTeam.name,
        saveGameId: saveTeam.saveGameId,
        division: saveTeam.division,
        localIndex: saveTeam.localIndex!,
        baseTeamId: saveTeam.baseTeamId,
        morale: saveTeam.morale,
        currentSeason: saveTeam.currentSeason,
        rating: saveTeam.rating,
      });

      idx++;
    }
  }

  try {
    await syncPlayersWithNewTeamRating(saveGameTeams, divisionMap);
  } catch (err) {
    console.error("❌ Failed to generate players in syncPlayersWithNewTeamRating:", err);
    throw err;
  }

  const d4SaveTeams = saveGameTeams.filter(team => team.division === "D4");
  const randomTeam = d4SaveTeams[Math.floor(Math.random() * d4SaveTeams.length)];
  const coachTeamId = randomTeam.id;
  const userTeamName = randomTeam.name;

  await prisma.gameState.update({
    where: { id: (await prisma.gameState.findFirstOrThrow()).id },
    data: {
      currentSaveGameId: saveGame.id,
      coachTeamId,
      currentMatchday: 1,
      matchdayType: MatchdayType.LEAGUE,
      gameStage: GameStage.ACTION,
    },
  });

  const divisionPreview = (["D1", "D2", "D3", "D4"] as DivisionTier[]).map(
    (tier) =>
      `${tier}: ${divisionMap[tier]
        .map((bt) => saveTeamIds[bt.id])
        .join(", ")}`,
  );

  return {
    saveGameId: saveGame.id,
    coachTeamId,
    userTeamName,
    divisionPreview,
  };
}
