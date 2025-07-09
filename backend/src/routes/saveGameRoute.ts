// src/routes/saveGameRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';
import { applyTeamRatingBasedOnDivision } from '../utils/teamRater';
import { syncPlayersWithNewTeamRating } from '../utils/playerSync';

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

// POST new save game
router.post("/", async (req, res) => {
  const { name, coachName, countries } = req.body;

  try {
    const baseTeams = await prisma.baseTeam.findMany({
      where: { country: { in: countries } },
      include: { players: true },
    });

    if (baseTeams.length < 128) {
      return res.status(400).json({ error: "Not enough teams in those countries" });
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

    const divisionEntities = await prisma.division.findMany();
    const divisionLookup = Object.fromEntries(divisionEntities.map(d => [`D${d.level}`, d.id]));

    for (const [div, teams] of Object.entries(divisionMap)) {
      const divisionId = divisionLookup[div];
      for (const team of teams) {
        const teamRating = applyTeamRatingBasedOnDivision(parseInt(div.replace('D', '')));
        const createdTeam = await prisma.team.create({
          data: {
            name: team.name,
            country: team.country,
            rating: teamRating,
            stadiumSize: 10000,
            ticketPrice: 5,
            divisionId,
          },
        });

        await syncPlayersWithNewTeamRating(
          createdTeam.id,
          team.players.map((p, i) => ({
            id: i + 1,
            name: p.name,
            nationality: p.nationality || team.country,
            position: p.position,
            rating: p.rating,
            salary: p.salary,
            behavior: p.behavior,
          })),
          teamRating
        );
      }
    }

    // ✅ Snapshot full state now that teams exist
    const { createSaveGame } = await import('../services/createSaveGame');
    await createSaveGame(name, coachName);

    const divisionPreview = Object.entries(divisionMap).map(([div, teams]) => {
      const line = teams.map(t => t.name);
      return `${div}: ${line.join(', ')}`;
    });

    res.status(201).json({
      saveGameId: saveGame.id,
      userTeamId: userTeam.id,
      userTeamName: userTeam.name,
      divisionPreview,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create new savegame" });
  }
});


// POST load from save (non-destructive)
router.post("/load", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing save game ID" });

  try {
    const save = await prisma.saveGame.findUnique({
      where: { id },
      include: {
        teams: true,
        players: true,
      },
    });

    if (!save) return res.status(404).json({ error: "SaveGame not found" });

    const divisions = await prisma.division.findMany();
    const divisionMap = Object.fromEntries(divisions.map(d => [`D${d.level}`, d.id]));

    // Create all teams from save into live Team table
    for (const team of save.teams) {
      const teamRating = applyTeamRatingBasedOnDivision(parseInt(team.division.replace('D', '')));
      const createdTeam = await prisma.team.create({
        data: {
          name: team.name,
          country: 'Unknown',
          stadiumSize: 10000,
          ticketPrice: 5,
          rating: teamRating,
          divisionId: divisionMap[team.division],
        },
      });

      const players = save.players.filter(p => p.teamId === team.baseTeamId);
      await syncPlayersWithNewTeamRating(
        createdTeam.id,
        players.map((p, i) => ({
          id: i + 1,
          name: p.name,
          nationality: 'Unknown',
          position: p.position,
          rating: p.rating,
          salary: p.salary,
          behavior: p.behavior,
        })),
        teamRating
      );
    }

    const coachSaveTeam = save.teams.find(t => t.division === 'D4');
    if (!coachSaveTeam) {
      return res.status(500).json({ error: 'Could not determine coach team from save.' });
    }

    const coachTeam = await prisma.team.findFirst({ where: { name: coachSaveTeam.name } });
    if (!coachTeam) {
      return res.status(500).json({ error: 'Failed to find created coach team.' });
    }

    await prisma.gameState.create({
      data: {
        season: 1,
        currentMatchday: 1,
        matchdayType: 'LEAGUE',
        coachTeamId: coachTeam.id,
        gameStage: 'ACTION',
        currentSaveGameId: id,
      },
    });

    res.status(200).json({ message: "Game state loaded from save", coachTeamId: coachTeam.id });
  } catch (e: any) {
    console.error('❌ Failed to load save game:', e.message, e.stack);
    res.status(500).json({ error: "Failed to load save game" });
  }
});

export default router;
