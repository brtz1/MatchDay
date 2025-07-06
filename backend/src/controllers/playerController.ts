import { Request, Response } from 'express';
import playerService from '../services/playerService';
import teamService from '../services/teamService';

// Get all players
export const getAllPlayers = async (req: Request, res: Response) => {
  try {
    const players = await playerService.getAllPlayers();
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
};

// Get player by ID
export const getPlayerById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const player = await playerService.getPlayerById(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(200).json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
};

// Create a new player
export const createPlayer = async (req: Request, res: Response) => {
  try {
    const { name, age, position, rating, value, salary, teamId } = req.body;
    // If assigning to a team, verify team exists
    if (teamId) {
      const team = await teamService.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found for given teamId' });
      }
    }
    const newPlayer = await playerService.createPlayer({ name, age, position, rating, value, salary, teamId });
    res.status(201).json(newPlayer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create player' });
  }
};

// Update a player
export const updatePlayer = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    // Check if player exists
    const existing = await playerService.getPlayerById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Player not found' });
    }
    // If updating team assignment, check new team exists
    const { teamId } = req.body;
    if (teamId) {
      const team = await teamService.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found for given teamId' });
      }
    }
    const updatedPlayer = await playerService.updatePlayer(id, req.body);
    res.status(200).json(updatedPlayer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update player' });
  }
};

// Delete a player
export const deletePlayer = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    // Check if player exists
    const existing = await playerService.getPlayerById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Player not found' });
    }
    await playerService.deletePlayer(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete player' });
  }
};