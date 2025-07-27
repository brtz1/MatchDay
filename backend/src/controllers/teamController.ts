// src/controllers/teamController.ts

import { Request, Response, NextFunction } from 'express';
import {
  getAllTeams as fetchAllTeams,
  getTeamById as fetchTeamById,
  createTeam as createTeamService,
  updateTeam as updateTeamService,
  deleteTeam as deleteTeamService,
} from '../services/teamService';
import { DivisionTier } from '@prisma/client';

/**
 * GET /api/teams?saveGameId=#
 */
export async function getAllTeams(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const saveGameId = Number(req.query.saveGameId);
    if (isNaN(saveGameId)) {
      res.status(400).json({ error: 'Missing or invalid saveGameId' });
      return;
    }
    const teams = await fetchAllTeams(saveGameId);
    res.status(200).json(teams);
  } catch (error) {
    console.error('❌ Error fetching teams:', error);
    next(error);
  }
}

/**
 * GET /api/teams/:id?saveGameId=#
 */
export async function getTeamById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teamId = Number(req.params.id);
    const saveGameId = Number(req.query.saveGameId);
    if (isNaN(saveGameId) || isNaN(teamId)) {
      res.status(400).json({ error: 'Missing or invalid saveGameId or teamId' });
      return;
    }
    const team = await fetchTeamById(saveGameId, teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    res.status(200).json(team);
  } catch (error) {
    console.error(`❌ Error fetching team ${req.params.id}:`, error);
    next(error);
  }
}

/**
 * POST /api/teams
 * Body: { saveGameId, baseTeamId, name, division, morale, currentSeason, localIndex, rating }
 */
export async function createTeam(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      saveGameId,
      baseTeamId,
      name,
      division,
      morale,
      currentSeason,
      localIndex,
      rating,
    } = req.body;

    const dto = {
      saveGameId: Number(saveGameId),
      baseTeamId: Number(baseTeamId),
      name: String(name),
      division: division as DivisionTier,
      morale: morale !== undefined ? Number(morale) : 50,
      currentSeason: currentSeason !== undefined ? Number(currentSeason) : 1,
      localIndex: Number(localIndex),
      rating: Number(rating),
    };

    if (
      isNaN(dto.saveGameId) ||
      isNaN(dto.baseTeamId) ||
      isNaN(dto.localIndex) ||
      isNaN(dto.rating)
    ) {
      res.status(400).json({ error: 'saveGameId, baseTeamId, localIndex, and rating must be numbers' });
      return;
    }

    const newTeam = await createTeamService(dto);
    res.status(201).json(newTeam);
  } catch (error) {
    console.error('❌ Error creating team:', error);
    next(error);
  }
}

/**
 * PUT /api/teams/:id?saveGameId=#
 * Body: { name?, division?, morale?, currentSeason? }
 */
export async function updateTeam(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teamId = Number(req.params.id);
    const saveGameId = Number(req.query.saveGameId);
    if (isNaN(saveGameId) || isNaN(teamId)) {
      res.status(400).json({ error: 'Missing or invalid saveGameId or teamId' });
      return;
    }
    const existing = await fetchTeamById(saveGameId, teamId);
    if (!existing) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    const updates: {
      name?: string;
      division?: DivisionTier;
      morale?: number;
      currentSeason?: number;
    } = {};
    if (req.body.name !== undefined) {
      updates.name = String(req.body.name);
    }
    if (req.body.division !== undefined) {
      updates.division = req.body.division as DivisionTier;
    }
    if (req.body.morale !== undefined) {
      updates.morale = Number(req.body.morale);
    }
    if (req.body.currentSeason !== undefined) {
      updates.currentSeason = Number(req.body.currentSeason);
    }
    const updatedTeam = await updateTeamService(saveGameId, teamId, updates);
    res.status(200).json(updatedTeam);
  } catch (error) {
    console.error(`❌ Error updating team ${req.params.id}:`, error);
    next(error);
  }
}

/**
 * DELETE /api/teams/:id?saveGameId=#
 */
export async function deleteTeam(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teamId = Number(req.params.id);
    const saveGameId = Number(req.query.saveGameId);
    if (isNaN(saveGameId) || isNaN(teamId)) {
      res.status(400).json({ error: 'Missing or invalid saveGameId or teamId' });
      return;
    }
    const existing = await fetchTeamById(saveGameId, teamId);
    if (!existing) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    await deleteTeamService(saveGameId, teamId);
    res.status(204).send();
  } catch (error) {
    console.error(`❌ Error deleting team ${req.params.id}:`, error);
    next(error);
  }
}
