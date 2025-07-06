import { Request, Response } from 'express';
import refereeService from '../services/refereeService';

// Get all referees
export const getAllReferees = async (req: Request, res: Response) => {
  try {
    const referees = await refereeService.getAllReferees();
    res.status(200).json(referees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referees' });
  }
};

// Get referee by ID
export const getRefereeById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const referee = await refereeService.getRefereeById(id);
    if (!referee) {
      return res.status(404).json({ error: 'Referee not found' });
    }
    res.status(200).json(referee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referee' });
  }
};