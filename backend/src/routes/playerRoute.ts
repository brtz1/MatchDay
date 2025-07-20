import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentSaveGameId } from '../services/gameState';
import { calculatePlayerPrice } from '../utils/playerValuator';
import { PlayerDTO } from '../types';

const router = express.Router();

const isValidPosition = (pos: string): pos is PlayerDTO["position"] =>
  ["GK", "DF", "MF", "AT"].includes(pos);

/**
 * GET /api/players
 * List all players in the current save game
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const saveGameId = await getCurrentSaveGameId();
    if (!saveGameId) return res.status(400).json({ error: 'No active save game found' });

    const players = await prisma.saveGamePlayer.findMany({
      where: { saveGameId },
      include: {
        team: { select: { id: true, name: true } },
        basePlayer: { select: { name: true, nationality: true } },
      },
    });

    const result: PlayerDTO[] = players.map((p) => ({
      id: p.id,
      name: p.basePlayer.name,
      position: isValidPosition(p.position) ? p.position : "MF",
      rating: p.rating,
      salary: p.salary,
      behavior: p.behavior,
      contractUntil: p.contractUntil,
      nationality: p.basePlayer.nationality,
      teamId: p.team?.id ?? null,
      teamName: p.team?.name ?? "Free Agent",
      price: calculatePlayerPrice(p.rating, p.behavior),
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ Error fetching all players:', err);
    next(err);
  }
});

/**
 * GET /api/players/search
 * Search players within current save game by filters
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

    const filters: any = { saveGameId };

    if (position && typeof position === 'string' && isValidPosition(position)) {
      filters.position = position;
    }

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

    const result: PlayerDTO[] = players
      .filter((p) => {
        const price = calculatePlayerPrice(p.rating, p.behavior);
        const nameMatch =
          typeof name === 'string'
            ? p.basePlayer.name.toLowerCase().includes(name.toLowerCase())
            : true;
        const nationalityMatch =
          typeof nationality === 'string'
            ? p.basePlayer.nationality.toLowerCase().includes(nationality.toLowerCase())
            : true;
        const priceMatch =
          typeof priceMax === 'string' && !isNaN(Number(priceMax))
            ? price <= Number(priceMax)
            : true;

        return nameMatch && nationalityMatch && priceMatch;
      })
      .map((p) => ({
        id: p.id,
        name: p.basePlayer.name,
        position: isValidPosition(p.position) ? p.position : "MF",
        rating: p.rating,
        salary: p.salary,
        behavior: p.behavior,
        contractUntil: p.contractUntil,
        nationality: p.basePlayer.nationality,
        teamId: p.team?.id ?? null,
        teamName: p.team?.name ?? "Free Agent",
        price: calculatePlayerPrice(p.rating, p.behavior),
      }));

    res.json(result);
  } catch (err) {
    console.error('❌ Error searching players:', err);
    next(err);
  }
});

/**
 * GET /api/players/:playerId
 * Get single player by ID (within current save)
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
        team: { select: { id: true, name: true } },
        basePlayer: { select: { name: true, nationality: true } },
      },
    });

    if (!player) return res.status(404).json({ error: 'Player not found' });

    const result: PlayerDTO = {
      id: player.id,
      name: player.basePlayer.name,
      position: isValidPosition(player.position) ? player.position : "MF",
      rating: player.rating,
      salary: player.salary,
      behavior: player.behavior,
      contractUntil: player.contractUntil,
      nationality: player.basePlayer.nationality,
      teamId: player.team?.id ?? null,
      teamName: player.team?.name ?? "Free Agent",
      price: calculatePlayerPrice(player.rating, player.behavior),
    };

    res.json(result);
  } catch (err) {
    console.error(`❌ Error fetching player ${playerId}:`, err);
    next(err);
  }
});

/**
 * POST /api/players
 * Block direct player creation
 */
router.post('/', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Player creation is only allowed at game start.' });
});

export default router;
