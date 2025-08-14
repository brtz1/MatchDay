import express, { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getMatchStateById, applySubstitution, ensureInitialMatchState } from '../services/matchService';
import { getGameState } from '../services/gameState';

const router = express.Router();

/**
 * GET /api/matchstate/:matchId
 * Query (optional):
 *  - side=home|away
 *  - teamId=<number>
 *
 * Returns a hydrated view of ONE side (lineup, bench, subsRemaining) so the UI can
 * show formation and (if coach team) allow substitutions.
 */
router.get('/:matchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = Number(req.params.matchId);
    if (Number.isNaN(matchId)) return res.status(400).json({ error: 'Invalid matchId' });

    // Determine which side to return
    const sideParam = String(req.query.side || '').toLowerCase();
    const teamIdParam = req.query.teamId != null ? Number(req.query.teamId) : undefined;

    const match = await prisma.saveGameMatch.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Prefer explicit side, else by teamId, else by coach team, else home
    let isHomeTeam: boolean | null = null;
    if (sideParam === 'home') isHomeTeam = true;
    if (sideParam === 'away') isHomeTeam = false;

    if (isHomeTeam == null && typeof teamIdParam === 'number') {
      if (teamIdParam === match.homeTeamId) isHomeTeam = true;
      else if (teamIdParam === match.awayTeamId) isHomeTeam = false;
    }

    if (isHomeTeam == null) {
      const gs = await getGameState();
      if (gs?.coachTeamId === match.homeTeamId) isHomeTeam = true;
      else if (gs?.coachTeamId === match.awayTeamId) isHomeTeam = false;
    }

    if (isHomeTeam == null) isHomeTeam = true; // final default

    // Ensure state exists (creates default 4-4-2 if missing)
    await ensureInitialMatchState(matchId);

    const state = await getMatchStateById(matchId);
    if (!state) return res.status(404).json({ error: 'MatchState not found' });

    const lineupIds = (isHomeTeam ? state.homeLineup : state.awayLineup) ?? [];
    const benchIds  = (isHomeTeam ? state.homeReserves : state.awayReserves) ?? [];
    const subsMade  = isHomeTeam ? state.homeSubsMade : state.awaySubsMade;
    const formation = (isHomeTeam ? state.homeFormation : state.awayFormation) ?? '4-4-2';

    const allIds = [...lineupIds, ...benchIds];
    const players = allIds.length
      ? await prisma.saveGamePlayer.findMany({
          where: { id: { in: allIds } },
          select: { id: true, name: true, position: true, rating: true },
        })
      : [];

    // Helper to preserve order from state arrays
    const byId = new Map(players.map(p => [p.id, p]));
    const toDTO = (ids: number[]) =>
      ids.map(id => {
        const p = byId.get(id);
        return p
          ? { id: p.id, name: p.name, position: p.position, rating: p.rating, isInjured: false }
          : { id, name: `#${id}`, position: 'UNK', rating: 0, isInjured: false };
      });

    const lineup = toDTO(lineupIds);
    const bench  = toDTO(benchIds);
    const subsRemaining = Math.max(0, 3 - (subsMade ?? 0));

    res.json({
      matchId,
      isHomeTeam,
      teamId: isHomeTeam ? match.homeTeamId : match.awayTeamId,
      formation,
      lineup,
      bench,
      subsRemaining,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/matchstate/:matchId/substitute
 * Body: { out: number, in: number, isHomeTeam: boolean }
 */
router.post('/:matchId/substitute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = Number(req.params.matchId);
    const { out, in: inId, isHomeTeam } = req.body ?? {};
    if (
      Number.isNaN(matchId) ||
      typeof out !== 'number' ||
      typeof inId !== 'number' ||
      typeof isHomeTeam !== 'boolean'
    ) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    await applySubstitution(matchId, out, inId, isHomeTeam);
    // Rehydrate after substitution (same side)
    const state = await prisma.matchState.findUnique({ where: { matchId } });
    if (!state) return res.status(404).json({ error: 'MatchState not found after substitution' });

    const lineupIds = (isHomeTeam ? state.homeLineup : state.awayLineup) ?? [];
    const benchIds  = (isHomeTeam ? state.homeReserves : state.awayReserves) ?? [];
    const subsMade  = isHomeTeam ? state.homeSubsMade : state.awaySubsMade;

    const allIds = [...lineupIds, ...benchIds];
    const players = allIds.length
      ? await prisma.saveGamePlayer.findMany({
          where: { id: { in: allIds } },
          select: { id: true, name: true, position: true, rating: true },
        })
      : [];

    const byId = new Map(players.map(p => [p.id, p]));
    const toDTO = (ids: number[]) =>
      ids.map(id => {
        const p = byId.get(id);
        return p
          ? { id: p.id, name: p.name, position: p.position, rating: p.rating, isInjured: false }
          : { id, name: `#${id}`, position: 'UNK', rating: 0, isInjured: false };
      });

    res.json({
      matchId,
      isHomeTeam,
      lineup: toDTO(lineupIds),
      bench: toDTO(benchIds),
      subsRemaining: Math.max(0, 3 - (subsMade ?? 0)),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
