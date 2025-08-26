import express from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* GET: Matches (optionally filter by matchday number)                         */
/*    Query:
 *      - matchday?: number   (filters by the matchday number within this save)
 * -------------------------------------------------------------------------- */
router.get('/', async (req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    // Parse matchday number safely
    let matchdayNum: number | undefined;
    if (typeof req.query.matchday === 'string' && req.query.matchday.trim() !== '') {
      const n = Number(req.query.matchday);
      if (Number.isFinite(n)) matchdayNum = n;
    }

    // If a matchday number was provided, resolve its id within this save
    let matchdayFilter: { matchdayId?: number } = {};
    if (typeof matchdayNum === 'number') {
      const md = await prisma.matchday.findFirst({
        where: { saveGameId, number: matchdayNum },
        select: { id: true },
      });
      if (!md) {
        // No such matchday for this save — return empty list
        return res.status(200).json([]);
      }
      matchdayFilter.matchdayId = md.id;
    }

    const matches = await prisma.saveGameMatch.findMany({
      where: {
        saveGameId,
        ...matchdayFilter,
      },
      include: {
        homeTeam: { select: { id: true, name: true, division: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: [{ id: 'asc' }],
    });

    // Shape to frontend DTO
    const result = matches.map((m) => ({
      id: m.id,
      homeTeam: {
        id: m.homeTeam.id,
        name: m.homeTeam.name,
      },
      awayTeam: {
        id: m.awayTeam.id,
        name: m.awayTeam.name,
      },
      homeGoals: m.homeGoals ?? 0,
      awayGoals: m.awayGoals ?? 0,
      division: m.homeTeam.division, // use home team tier for grouping
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error fetching matches:', error);
    next(error);
  }
});

export default router;
