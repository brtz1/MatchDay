// src/routes/seasonRoute.ts

import { Router } from 'express';
import prisma from '../utils/prisma';
import { MatchdayType } from '@prisma/client';

const router = Router();

/**
 * Start a new season: creates 14 league and 7 cup matchdays
 */
router.post('/start', async (_req, res) => {
  try {
    // Get all divisions (1 to 4)
    const divisions = await prisma.division.findMany({
      where: { level: { lte: 4 } },
      include: { teams: true },
    });

    let matchdayCounter = 1;

    // Create 14 league matchdays per division (double round-robin = 14 rounds)
    for (const division of divisions) {
      const teams = division.teams;
      if (teams.length < 2) continue;

      for (let round = 1; round <= 14; round++) {
        await prisma.matchday.create({
          data: {
            number: matchdayCounter++,
            type: MatchdayType.LEAGUE,
            date: new Date(),
          },
        });
      }
    }

    // Create 7 cup matchdays (global)
    for (let i = 1; i <= 7; i++) {
      await prisma.matchday.create({
        data: {
          number: matchdayCounter++,
          type: MatchdayType.CUP,
          date: new Date(),
        },
      });
    }

    res.json({ message: 'New season started and matchdays created.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start season' });
  }
});

/**
 * Get all matchdays with matches and events
 */
router.get('/matchdays', async (_req, res) => {
  try {
    const matchdays = await prisma.matchday.findMany({
      include: {
        matches: {
          include: { events: true },
        },
      },
      orderBy: { number: 'asc' },
    });

    res.json(matchdays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch matchdays' });
  }
});

export default router;
