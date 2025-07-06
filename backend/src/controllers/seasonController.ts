import { Request, Response } from 'express';
import { initializeLeagueTable, scheduleSeason } from '../services/seasonService';

export const startSeason = async (req: Request, res: Response) => {
  try {
    await initializeLeagueTable();
    const fixtures = await scheduleSeason();
    res.status(200).json({ fixtures });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start season' });
  }
};