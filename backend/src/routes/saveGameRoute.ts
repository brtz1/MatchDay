import { Router } from 'express';
import prisma from '../utils/prisma';
import { applyTeamRatingBasedOnDivision } from '../utils/teamRater';
import { syncPlayersWithNewTeamRating } from '../utils/playerSync';
import { GameStage, MatchdayType } from '@prisma/client';

const router = Router();

// GET all save games
router.get("/", async (req, res) => {
  try {
    const includeTeams = req.query.includeTeams === 'true';

    const saves = await prisma.saveGame.findMany({
      orderBy: { createdAt: 'desc' },
      include: includeTeams ? { teams: true } : undefined,
    });

    res.json(saves);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load savegames" });
  }
});

// POST new save game from country selection
router.post("/", async (req, res) => {
  const { name, coachName, countries } = req.body;

  try {
    const baseTeams = await prisma.baseTeam.findMany({
      where: { country: { in: countries } },
      include: { players: true },
    });

    if (baseTeams.length < 128) {
      return res.status(400).json({ error: "Not enough teams in selected countries" });
    }

    const ordered = baseTeams.sort((a, b) => b.rating - a.rating);
    const divisionMap = {
      D1: ordered.slice(0, 8),
      D2: ordered.slice(8, 16),
      D3: ordered.slice(16, 24),
      D4: ordered.slice(24, 32),
    };

    const userTeam = divisionMap.D4[Math.floor(Math.random() * 8)];

    const saveGame = await prisma.saveGame.create({
      data: { name, coachName },
    });

    const saveGameTeamIds: { [baseTeamId: number]: number } = {};

    for (const [division, teams] of Object.entries(divisionMap)) {
      for (const team of teams) {
        const newTeam = await prisma.saveGameTeam.create({
          data: {
            saveGameId: saveGame.id,
            name: team.name,
            morale: 50,
            baseTeamId: team.id,
            currentSeason: 1,
            division: division as any,
          },
        });

        saveGameTeamIds[team.id] = newTeam.id;

        for (const player of team.players) {
          await prisma.saveGamePlayer.create({
            data: {
              saveGameId: saveGame.id,
              teamId: newTeam.id,
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
    }

    await applyTeamRatingBasedOnDivision(saveGame.id);
    await syncPlayersWithNewTeamRating(saveGame.id, baseTeams, divisionMap);

    const coachSaveGameTeamId = saveGameTeamIds[userTeam.id];
    await prisma.gameState.create({
      data: {
        currentSaveGameId: saveGame.id,
        coachTeamId: coachSaveGameTeamId,
        currentMatchday: 1,
        matchdayType: MatchdayType.LEAGUE,
        gameStage: GameStage.ACTION,
      },
    });

    const divisionPreview = Object.entries(divisionMap).map(([div, teams]) => {
      return `${div}: ${teams.map(team => saveGameTeamIds [team.id]).join(', ')}`;
    });

    res.status(201).json({
      saveGameId: saveGame.id,
      userTeamId: coachSaveGameTeamId,
      userTeamName: userTeam.name,
      divisionPreview,
    });
  } catch (e: any) {
  console.error('❌ Save game creation failed:', e.message, e.stack);
  res.status(500).json({ error: e.message });
  }
});

// POST load from save (into active memory only)
router.post("/load", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing save game ID" });

  try {
    const save = await prisma.saveGame.findUnique({
      where: { id },
      include: { teams: true },
    });

    if (!save) return res.status(404).json({ error: "SaveGame not found" });

    const coachTeam = save.teams.find(SaveGameTeams => SaveGameTeams.division === 'D4');
    if (!coachTeam) {
      return res.status(500).json({ error: 'Could not determine coach team from save.' });
    }

    const existing = await prisma.gameState.findFirst();
    if (existing) {
      await prisma.gameState.delete({ where: { id: existing.id } });
    }

    await prisma.gameState.create({
      data: {
        currentSaveGameId: save.id,
        coachTeamId: coachTeam.id,
        gameStage: GameStage.ACTION,
        currentMatchday: 1,
        matchdayType: MatchdayType.LEAGUE,
      },
    });

    res.status(200).json({
      message: "Game state loaded from save",
      coachTeamId: coachTeam.id,
    });
  } catch (e: any) {
    console.error('❌ Failed to load save game:', e.message, e.stack);
    res.status(500).json({ error: "Failed to load save game" });
  }
});

export default router;