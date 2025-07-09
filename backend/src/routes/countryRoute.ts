// src/routes/countryRoute.ts

import express from 'express';
import prisma from '../utils/prisma';

const router = express.Router();

// GET /api/countries
router.get('/', async (req, res) => {
  try {
    const baseTeams = await prisma.baseTeam.findMany({
      select: { country: true },
    });

    if (!baseTeams || baseTeams.length === 0) {
      console.warn('⚠️ No baseTeams found in DB.');
    }

    const teamCounts: { [key: string]: number } = {};

    baseTeams.forEach(({ country }) => {
      if (!country) return;
      teamCounts[country] = (teamCounts[country] || 0) + 1;
    });

    const countries = Object.keys(teamCounts);
    console.log('✅ Returning countries and team counts:', { countries, teamCounts });

    res.json({ countries, teamCounts });
  } catch (err) {
    console.error('❌ Error fetching countries:', err);
    res.status(500).json({ error: 'Failed to load country list' });
  }
});

// POST /api/club-count
router.post('/club-count', async (req, res) => {
  const { countries } = req.body;

  if (!Array.isArray(countries) || countries.length === 0) {
    return res.status(400).json({ error: 'Missing country list' });
  }

  try {
    const count = await prisma.baseTeam.count({
      where: {
        country: { in: countries },
      },
    });

    res.json({ count });
  } catch (err) {
    console.error('Error counting clubs:', err);
    res.status(500).json({ error: 'Failed to count clubs' });
  }
});

export default router;
