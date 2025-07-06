import { Request, Response } from 'express';
import matchService from '../services/matchService';
import teamService from '../services/teamService';
import refereeService from '../services/refereeService';

// Get all matches
export const getAllMatches = async (req: Request, res: Response) => {
  try {
    const matches = await matchService.getAllMatches();
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

// Get match by ID
export const getMatchById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const match = await matchService.getMatchById(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
};

// Create (simulate) a new match
export const createMatch = async (req: Request, res: Response) => {
  try {
    const { homeTeamId, awayTeamId, refereeId } = req.body;
    // Validate teams and referee exist
    const homeTeam = await teamService.getTeamById(homeTeamId);
    const awayTeam = await teamService.getTeamById(awayTeamId);
    const referee = await refereeService.getRefereeById(refereeId);
    if (!homeTeam || !awayTeam) {
      return res.status(404).json({ error: 'One or both team IDs not found' });
    }
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }
    // Simulate the match result and update database
    const matchResult = await matchService.playMatch(homeTeam, awayTeam, referee);
    res.status(201).json(matchResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create match' });
  }
};