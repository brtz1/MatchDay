import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Start a new season
 */
router.post('/start', async (_req, res) => {
  try {
    // get all divisions except distrital (levels 1–4)
    const divisions = await prisma.division.findMany({
      where: { level: { lte: 4 } },
      include: { teams: true },
    });

    // create league matchdays
    for (let d of divisions) {
      const teams = d.teams;
      for (let round = 1; round <= 14; round++) {
        await prisma.matchday.create({
          data: {
            number: round,
            type: "LEAGUE",
            date: new Date(),
          },
        });
      }
    }

    // cup matchdays (7)
    for (let i = 1; i <= 7; i++) {
      await prisma.matchday.create({
        data: {
          number: 14 + i,
          type: "CUP",
          date: new Date(),
        },
      });
    }

    res.json({ message: "New season started and matchdays created." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start season" });
  }
});

/**
 * Get all matchdays
 */
router.get('/matchdays', async (_req, res) => {
  try {
    const matchdays = await prisma.matchday.findMany({
      include: { matches: true, events: true },
      orderBy: { number: 'asc' },
    });
    res.json(matchdays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch matchdays' });
  }
});

export default router;
