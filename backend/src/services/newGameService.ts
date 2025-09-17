import prisma from "../utils/prisma";
import { GameStage, MatchdayType, DivisionTier } from "@prisma/client";
import { syncPlayersWithNewTeamRating } from "../utils/playerSync";
import { generateFullSeason } from "./fixtureServices";
import { generateInitialCupBracket } from "./cupBracketService";
import type { SaveGameTeamLite } from "../types/index";

/* ──────────────────────────────── Types ──────────────────────────────── */
export interface NewGameResult {
  saveGameId: number;
  coachTeamId: number;
  userTeamName: string;
  divisionPreview: string[];
}

/* ──────────────────────────────── Helpers ──────────────────────────────── */
function generateTeamRatingForDivision(tier: DivisionTier): number {
  switch (tier) {
    case "D1":
      return Math.floor(Math.random() * 10) + 38; // 38–47
    case "D2":
      return Math.floor(Math.random() * 13) + 28; // 28–40
    case "D3":
      return Math.floor(Math.random() * 13) + 18; // 18–30
    case "D4":
      return Math.floor(Math.random() * 13) + 8; // 8–20
    case "DIST":
      return Math.floor(Math.random() * 8) + 1; // 1–8
    default:
      return 1;
  }
}

/* ──────────────────────────────── Main ──────────────────────────────── */
export async function startNewGame(
  selectedCountries: string[]
): Promise<NewGameResult> {
  console.log("🚩 startNewGame called with countries:", selectedCountries);

  // 1. Load base teams and their players
  const baseTeams = await prisma.baseTeam.findMany({
    where: { country: { in: selectedCountries } },
    include: { players: true },
  });

  if (baseTeams.length < 128) {
    throw new Error("Need at least 128 clubs across chosen countries.");
  }

  // 2. Sort by original rating and assign to divisions
  const ordered = [...baseTeams].sort((a, b) => b.rating - a.rating);
  const divisionMap: Record<DivisionTier, typeof baseTeams> = {
    D1: ordered.slice(0, 8),
    D2: ordered.slice(8, 16),
    D3: ordered.slice(16, 24),
    D4: ordered.slice(24, 32),
    DIST: ordered.slice(32, 128),
  };

  // 3. Create SaveGame entry
  const saveGame = await prisma.saveGame.create({
    data: { name: `Save ${Date.now()}`, coachName: null },
  });

  // 4. Create SaveGameTeams with ratings and division
  const saveGameTeams: SaveGameTeamLite[] = [];
  let localIndex = 0;

  for (const [tier, teams] of Object.entries(divisionMap) as [
    DivisionTier,
    typeof baseTeams
  ][]) {
    for (const base of teams) {
      const rating = generateTeamRatingForDivision(tier);
      const team = await prisma.saveGameTeam.create({
        data: {
          saveGameId: saveGame.id,
          baseTeamId: base.id,
          name: base.name,
          division: tier,
          morale: 75,
          currentSeason: 1,
          localIndex,
          rating,
        },
      });

      saveGameTeams.push({
        id: team.id,
        name: team.name,
        rating: team.rating,
        saveGameId: team.saveGameId,
        baseTeamId: team.baseTeamId,
        division: team.division,
        morale: team.morale,
        currentSeason: team.currentSeason,
        localIndex: team.localIndex ?? 0,
      });

      localIndex++;
    }
  }

  // 5. Create league table entries
  for (const team of saveGameTeams) {
    await prisma.leagueTable.upsert({
      where: { teamId: team.id },
      update: {},
      create: { teamId: team.id },
    });
  }

  // 6. Create players for all teams with rating/salary synced
  await syncPlayersWithNewTeamRating(saveGameTeams, divisionMap);

  // 7. Select a random Division 4 team as the coach
  const d4Teams = saveGameTeams.filter((t) => t.division === "D4");
  const coach = d4Teams[Math.floor(Math.random() * d4Teams.length)];

  // 8. Update GameState with new save and coach info
  const gameState = await prisma.gameState.findFirstOrThrow();
  await prisma.gameState.update({
    where: { id: gameState.id },
    data: {
      currentSaveGameId: saveGame.id,
      coachTeamId: coach.id,
      currentMatchday: 1,
      matchdayType: MatchdayType.LEAGUE,
      gameStage: GameStage.ACTION,
    },
  });

  // 9. Generate Cup bracket (Round of 128) using dedicated service
  //    Safe to call even if another generator already created CUP matchdays:
  //    generateInitialCupBracket() is idempotent and returns early if CUP exists.
  console.log("🏆 Generating initial Cup bracket (Round of 128)...");
  await generateInitialCupBracket(saveGame.id);

  // 10. Generate league fixtures/season
  //     If your generateFullSeason also creates CUP, the call above will no-op.
  console.log("🔵 Generating full league season...");
  await generateFullSeason(
    saveGame.id,
    saveGameTeams.map((t) => ({ id: t.id }))
  );

  // 11. Return result with division preview
  const divisionPreview = (["D1", "D2", "D3", "D4"] as DivisionTier[]).map(
    (tier) => {
      const ids = saveGameTeams
        .filter((t) => t.division === tier)
        .map((t) => t.id)
        .join(", ");
      return `${tier}: ${ids}`;
    }
  );

  return {
    saveGameId: saveGame.id,
    coachTeamId: coach.id,
    userTeamName: coach.name,
    divisionPreview,
  };
}
