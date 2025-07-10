import { Request, Response } from 'express';
import teamService from '../services/teamService';

// Get all teams
export const getAllTeams = async (req: Request, res: Response) => {
  try {
    const teams = await teamService.getAllTeams();
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

// Get team by ID
export const getTeamById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const team = await teamService.getTeamById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.status(200).json(team);  // fixed status code to 200
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

// Create a new team
export const createTeam = async (req: Request, res: Response) => {
  try {
    const newTeam = await teamService.createTeam(req.body);
    res.status(201).json(newTeam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
};

// Update a team
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    // Check if team exists
    const existing = await teamService.getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }
    // Perform update
    const { name, country } = req.body;
    const updatedTeam = await teamService.updateTeam(id, { name, country });
    res.status(200).json(updatedTeam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' });
  }
};

// Delete a team
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    // Check if team exists
    const existing = await teamService.getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }
    await teamService.deleteTeam(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
};