import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = express.Router();

/**
 * GET /api/countries
 * Returns list of country names and counts of base teams per country.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await prisma.baseTeam.findMany({
      select: { country: true },
    });

    const teamCounts = entries.reduce<Record<string, number>>((acc, { country }) => {
      if (country) acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    const countries = Object.keys(teamCounts);
    res.status(200).json({ countries, teamCounts });
  } catch (error) {
    console.error('❌ Error fetching countries:', error);
    next(error);
  }
});

/**
 * POST /api/countries/club-count
 * Body: { countries: string[] }
 * Returns total number of base teams in the specified countries.
 */
router.post('/club-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { countries } = req.body;
    if (!Array.isArray(countries) || countries.length === 0) {
      res.status(400).json({ error: 'Missing or invalid countries array' });
      return;
    }

    const count = await prisma.baseTeam.count({
      where: { country: { in: countries } },
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('❌ Error counting clubs:', error);
    next(error);
  }
});

export default router;
