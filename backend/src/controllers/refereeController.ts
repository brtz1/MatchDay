import { Request, Response, NextFunction } from 'express';
import * as refereeService from '../services/refereeService';

/**
 * GET /api/referees
 * Fetch all referees (static data).
 */
export async function getAllReferees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const referees = await refereeService.getAllReferees();
    res.status(200).json(referees);
  } catch (error) {
    console.error('❌ Error fetching referees:', error);
    next(error);
  }
}

/**
 * GET /api/referees/:id
 * Fetch a single referee by ID (static data).
 */
export async function getRefereeById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = Number(req.params.id);
  try {
    const referee = await refereeService.getRefereeById(id);
    if (!referee) {
      res.status(404).json({ error: 'Referee not found' });
      return;
    }
    res.status(200).json(referee);
  } catch (error) {
    console.error(`❌ Error fetching referee ${id}:`, error);
    next(error);
  }
}
