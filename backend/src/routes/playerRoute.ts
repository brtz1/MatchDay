import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';
import { calculatePlayerPrice } from '../utils/playerValuator';
import { PlayerDTO } from '../types';

const router = express.Router();

/**
 * GET /api/players
 * Fetch all players in the current save game.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

    const players = await prisma.saveGamePlayer.findMany({
      where: { saveGameId },
      include: {
        team: true,
        basePlayer: true,
      },
    });

    const result: PlayerDTO[] = players.map(p => ({
      id: p.id,
      name: p.basePlayer.name,
      position: p.position,
      rating: p.rating,
      salary: p.salary,
      behavior: p.behavior,
      contractUntil: p.contractUntil,
      nationality: p.basePlayer.nationality,
      teamName: p.team?.name ?? 'Free Agent',
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error fetching players:', error);
    next(error);
  }
});

/**
 * GET /api/players/:playerId
 * Fetch a single player by ID within the current save game.
 */
router.get('/:playerId', async (req: Request, res: Response, next: NextFunction) => {
  const playerId = Number(req.params.playerId);
  if (isNaN(playerId)) return res.status(400).json({ error: 'Invalid player ID' });

  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

    const player = await prisma.saveGamePlayer.findFirst({
      where: { id: playerId, saveGameId },
      include: {
        team: true,
        basePlayer: true,
      },
    });

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const result: PlayerDTO = {
      id: player.id,
      name: player.basePlayer.name,
      position: player.position,
      rating: player.rating,
      salary: player.salary,
      behavior: player.behavior,
      contractUntil: player.contractUntil,
      nationality: player.basePlayer.nationality,
      teamName: player.team?.name ?? 'Free Agent',
    };

    res.status(200).json(result);
  } catch (error) {
    console.error(`❌ Error fetching player ${playerId}:`, error);
    next(error);
  }
});

/**
 * POST /api/players
 * Prohibit creating players via API.
 */
router.post('/', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Player creation is only allowed at game start.' });
});

/**
 * GET /api/players/search
 * Search players by filters within the current save game.
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

    const {
      name,
      position,
      nationality,
      priceMax,
      ratingMin,
      ratingMax,
    } = req.query;

    const filters: any = {
      saveGameId,
      ...(position ? { position } : {}),
    };

    if (ratingMin && !isNaN(Number(ratingMin))) {
      filters.rating = { ...filters.rating, gte: Number(ratingMin) };
    }
    if (ratingMax && !isNaN(Number(ratingMax))) {
      filters.rating = { ...filters.rating, lte: Number(ratingMax) };
    }

    const players = await prisma.saveGamePlayer.findMany({
      where: filters,
      include: {
        team: { select: { id: true, name: true } },
        basePlayer: { select: { name: true, nationality: true } },
      },
    });

    const filtered = players.filter((p) => {
      const playerPrice = calculatePlayerPrice(p.rating, p.behavior);
      const matchesName = typeof name === 'string'
        ? p.basePlayer.name.toLowerCase().includes(name.toLowerCase())
        : true;
      const matchesNationality = typeof nationality === 'string'
        ? p.basePlayer.nationality === nationality
        : true;
      const matchesPrice = typeof priceMax === 'string' && !isNaN(Number(priceMax))
        ? playerPrice <= Number(priceMax)
        : true;
      return matchesName && matchesNationality && matchesPrice;
    });

    const result: PlayerDTO[] = filtered.map(p => ({
      id: p.id,
      name: p.basePlayer.name,
      position: p.position,
      rating: p.rating,
      salary: p.salary,
      behavior: p.behavior,
      contractUntil: p.contractUntil,
      nationality: p.basePlayer.nationality,
      teamName: p.team?.name ?? 'Free Agent',
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error searching players:', error);
    next(error);
  }
});

export default router;
