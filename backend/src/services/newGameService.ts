/* --------------------------------------------------------------------------
   Start-new-game service
   Draws 128 clubs → 4 visible divisions (8 each) + 96 in DIST tier.
--------------------------------------------------------------------------- */

import prisma from "../utils/prisma";
import { GameStage, MatchdayType, DivisionTier } from "@prisma/client";
import {
  assignTeamsToDivisions,
  TeamPoolEntry,
} from "../utils/divisionAssigner";
import { syncPlayersWithNewTeamRating } from "../utils/playerSync";

export interface NewGameResult {
  saveGameId: number;
  coachTeamId: number;
  userTeamName: string;
  divisionPreview: string[]; // only D1–D4 for UI
}

export async function startNewGame(
  selectedCountries: string[],
): Promise<NewGameResult> {
  /* -------------------------------- load base clubs */
  const baseTeams = await prisma.baseTeam.findMany({
    where: { country: { in: selectedCountries } },
    include: { players: true },
  });
  if (baseTeams.length < 128) {
    throw new Error("Need at least 128 clubs across chosen countries.");
  }

  /* -------------------------------- visible tiers via rating sort */
  const ordered = [...baseTeams].sort((a, b) => b.rating - a.rating);
  const divisionMap: Record<DivisionTier, typeof baseTeams> = {
    D1: ordered.slice(0, 8),
    D2: ordered.slice(8, 16),
    D3: ordered.slice(16, 24),
    D4: ordered.slice(24, 32),
    DIST: ordered.slice(32, 128), // hidden district pool
  };

  /* -------------------------------- create SaveGame */
  const saveGame = await prisma.saveGame.create({
    data: { name: `Save ${Date.now()}`, coachName: null },
  });

  /* -------------------------------- create SaveGameTeams & Players */
  let idx = 0;
  const saveTeamIds: Record<number, number> = {};

  for (const [tier, teams] of Object.entries(divisionMap) as [
    DivisionTier,
    typeof baseTeams,
  ][]) {
    for (const base of teams) {
      const saveTeam = await prisma.saveGameTeam.create({
        data: {
          saveGameId: saveGame.id,
          baseTeamId: base.id,
          name: base.name,
          division: tier,
          morale: 75,
          currentSeason: 1,
          localIndex: idx++, // 0-127 unique
        },
      });
      saveTeamIds[base.id] = saveTeam.id;

      /* players */
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

  /* -------------------------------- adjust ratings & sync */
  await syncPlayersWithNewTeamRating(saveGame.id, baseTeams, divisionMap);

  /* -------------------------------- pick user team (random D4) */
  const d4Ids = divisionMap.D4.map((bt) => saveTeamIds[bt.id]);
  const coachTeamId = d4Ids[Math.floor(Math.random() * d4Ids.length)];
  const userTeamName =
    divisionMap.D4.find((bt) => saveTeamIds[bt.id] === coachTeamId)!.name;

  /* -------------------------------- initialise GameState */
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

  /* -------------------------------- D1-D4 preview for UI */
  const divisionPreview = (["D1", "D2", "D3", "D4"] as DivisionTier[]).map(
    (tier) => `${tier}: ${divisionMap[tier].map((bt) => saveTeamIds[bt.id]).join(", ")}`,
  );

  return { saveGameId: saveGame.id, coachTeamId, userTeamName, divisionPreview };
}
