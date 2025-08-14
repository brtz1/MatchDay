import express from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* GET: Matches (optionally filter by matchday number)                         */
/* -------------------------------------------------------------------------- */
router.get('/', async (req, res, next) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) {
      return res.status(400).json({ error: 'No active save game found' });
    }

    const matchdayNum = req.query.matchday
      ? parseInt(String(req.query.matchday), 10)
      : undefined;

    const matches = await prisma.saveGameMatch.findMany({
      where: {
        saveGameId,
        ...(matchdayNum ? { matchday: { number: matchdayNum } } : {}),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        matchday: { select: { number: true, type: true } },
      },
      orderBy: [{ id: 'asc' }],
    });

    // Shape to frontend DTO, without colors, and with minute defaulted to 0.
    const result = matches.map((m) => ({
      id: m.id,
      homeTeam: {
        id: m.homeTeamId,
        name: m.homeTeam.name,
      },
      awayTeam: {
        id: m.awayTeamId,
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
