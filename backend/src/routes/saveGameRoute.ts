// src/routes/saveGameRoute.ts

import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { applyTeamRatingBasedOnDivision } from '../utils/teamRater';
import { syncPlayersWithNewTeamRating } from '../utils/playerSync';
import { DivisionTier, GameStage, MatchdayType } from '@prisma/client';

const router = express.Router();

/**
 * GET /api/save-game
 * Query: includeTeams=true to include team data
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeTeams = req.query.includeTeams === 'true';
      const saves = await prisma.saveGame.findMany({
        orderBy: { createdAt: 'desc' },
        include: includeTeams ? { teams: true } : undefined,
      });
      res.status(200).json(saves);
    } catch (error) {
      console.error('❌ Error fetching save games:', error);
      next(error);
    }
  }
);

/**
 * POST /api/save-game
 * Body: { name: string; coachName?: string; countries: string[] }
 * Initializes a new save game from base data.
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, coachName, countries } = req.body;
      if (!Array.isArray(countries) || countries.length < 1) {
        res.status(400).json({ error: 'Must provide a non-empty countries array' });
        return;
      }

      // Load base teams and players
      const baseTeams = await prisma.baseTeam.findMany({
        where: { country: { in: countries } },
        include: { players: true },
      });
      if (baseTeams.length < 128) {
        res
          .status(400)
          .json({ error: 'Not enough teams in selected countries (minimum 128 required)' });
        return;
      }

      // Sort and partition into divisions
      const ordered = baseTeams.sort((a, b) => b.rating - a.rating);
      const divisionMap: Record<DivisionTier, typeof ordered> = {
        D1: ordered.slice(0, 8),
        D2: ordered.slice(8, 16),
        D3: ordered.slice(16, 24),
        D4: ordered.slice(24, 32),
      };

      // Pick random user team from D4
      const userBase = divisionMap.D4[Math.floor(Math.random() * divisionMap.D4.length)];

      // Create saveGame
      const saveGame = await prisma.saveGame.create({
        data: { name, coachName },
      });
      const saveGameTeamIds: Record<number, number> = {};

      // Create SaveGameTeam & SaveGamePlayer entries
      for (const [division, teams] of Object.entries(
        divisionMap
      ) as [DivisionTier, typeof ordered][]) {
        for (let i = 0; i < teams.length; i++) {
          const team = teams[i];
          const saveTeam = await prisma.saveGameTeam.create({
            data: {
              saveGameId: saveGame.id,
              baseTeamId: team.id,
              name: team.name,
              division,
              morale: 75,
              currentSeason: 1,
              localIndex: i,
            },
          });
          saveGameTeamIds[team.id] = saveTeam.id;

          for (let j = 0; j < team.players.length; j++) {
            const player = team.players[j];
            await prisma.saveGamePlayer.create({
              data: {
                saveGameId: saveGame.id,
                basePlayerId: player.id,
                name: player.name,
                position: player.position,
                rating: player.rating,
                salary: player.salary,
                behavior: player.behavior,
                contractUntil: 1,
                teamId: saveTeam.id,
                localIndex: j,
              },
            });
          }
        }
      }

      // Adjust ratings based on division and sync players
      await applyTeamRatingBasedOnDivision(saveGame.id);
      await syncPlayersWithNewTeamRating(saveGame.id, baseTeams, divisionMap);

      // Initialize GameState
      const coachTeamId = saveGameTeamIds[userBase.id];
      await prisma.gameState.create({
        data: {
          currentSaveGameId: saveGame.id,
          coachTeamId,
          currentMatchday: 1,
          matchdayType: MatchdayType.LEAGUE,
          gameStage: GameStage.ACTION,
        },
      });

      // Build a preview of division composition
      const divisionPreview = Object.entries(divisionMap).map(
        ([div, teams]) => `${div}: ${teams.map(t => saveGameTeamIds[t.id]).join(', ')}`
      );

      res.status(201).json({
        saveGameId: saveGame.id,
        userTeamId: coachTeamId,
        userTeamName: userBase.name,
        divisionPreview,
      });
    } catch (error) {
      console.error('❌ Error creating save game:', error);
      next(error);
    }
  }
);

/**
 * POST /api/save-game/load
 * Body: { id: number }
 * Loads an existing save into GameState.
 */
router.post(
  '/load',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const saveId = Number(req.body.id);
      if (isNaN(saveId)) {
        res.status(400).json({ error: 'Invalid save game ID' });
        return;
      }

      const save = await prisma.saveGame.findUnique({
        where: { id: saveId },
        include: { teams: true },
      });
      if (!save) {
        res.status(404).json({ error: 'SaveGame not found' });
        return;
      }

      // Identify coach team (first D4)
      const coachTeam = save.teams.find(t => t.division === DivisionTier.D4);
      if (!coachTeam) {
        res
          .status(500)
          .json({ error: 'Cannot identify coach team in save game' });
        return;
      }

      // Reset existing GameState
      const existing = await prisma.gameState.findFirst();
      if (existing) {
        await prisma.gameState.delete({ where: { id: existing.id } });
      }

      // Create new GameState pointing to this save
      await prisma.gameState.create({
        data: {
          currentSaveGameId: save.id,
          coachTeamId: coachTeam.id,
          currentMatchday: 1,
          matchdayType: MatchdayType.LEAGUE,
          gameStage: GameStage.ACTION,
        },
      });

      res
        .status(200)
        .json({ message: 'Game state loaded', coachTeamId: coachTeam.id });
    } catch (error) {
      console.error('❌ Error loading save game:', error);
      next(error);
    }
  }
);

export default router;
