import { Request, Response } from 'express';
import teamService from '../services/teamServices';

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
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

// Create new team
export const createTeam = async (req: Request, res: Response) => {
  try {
    const newTeam = await teamService.createTeam(req.body);
    res.status(201).json(newTeam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
};