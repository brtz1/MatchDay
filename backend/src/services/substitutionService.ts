// backend/src/services/substitutionService.ts

import prisma from '../utils/prisma';
import {
  SaveGamePlayer,
  MatchEvent as PrismaMatchEvent,
  GameStage,
} from '@prisma/client';
import { applySubstitution } from './matchService';
import { applyAISubstitutions } from './halftimeService';
import { ensureAppearanceRows } from './appearanceService';
import { getGameState } from './gameState';

export interface MatchLineup {
  matchId: number;
  homeLineup: number[];
  awayLineup: number[];
  homeReserves: number[];
  awayReserves: number[];
  homeSubsMade: number;
  awaySubsMade: number;
  // The UI can infer pause from GameStage === HALFTIME
  isPaused: boolean;
  homePlayers: SaveGamePlayer[];
  awayPlayers: SaveGamePlayer[];
  events: {
    id: number;
    minute: number;
    type: string;          // <- schema uses `type` (enum), not `eventType`
    description: string;
    saveGamePlayerId?: number;
  }[];
}

/**
 * Fetches the current match state plus available players and events (save-game aware).
 */
export async function getMatchLineup(matchId: number): Promise<MatchLineup> {
  const state = await prisma.matchState.findUnique({
    where: { saveGameMatchId: matchId },
  });
  if (!state) throw new Error(`MatchState not found for match ${matchId}`);

  const match = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      saveGameId: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });
  if (!match) throw new Error(`SaveGameMatch ${matchId} not found`);

  // All selectable players for each team (save-game players)
  const [homePlayers, awayPlayers] = await Promise.all([
    prisma.saveGamePlayer.findMany({
      where: { teamId: match.homeTeamId },
      orderBy: { id: 'asc' },
    }),
    prisma.saveGamePlayer.findMany({
      where: { teamId: match.awayTeamId },
      orderBy: { id: 'asc' },
    }),
  ]);

  const events = await prisma.matchEvent.findMany({
    where: { saveGameMatchId: matchId },
    orderBy: [{ minute: 'asc' }, { id: 'asc' }],
  });

  // "Paused" is effectively whether we are in HALFTIME for this save
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: match.saveGameId },
    select: { gameStage: true },
  });

  return {
    matchId,
    homeLineup: state.homeLineup,
    awayLineup: state.awayLineup,
    homeReserves: state.homeReserves,
    awayReserves: state.awayReserves,
    homeSubsMade: state.homeSubsMade,
    awaySubsMade: state.awaySubsMade,
    isPaused: gs?.gameStage === GameStage.HALFTIME,
    homePlayers,
    awayPlayers,
    events: events.map((e: PrismaMatchEvent) => ({
      id: e.id,
      minute: e.minute,
      type: String(e.type),
      description: e.description,
      saveGamePlayerId: e.saveGamePlayerId ?? undefined,
    })),
  };
}

/**
 * Substitutes one player for another on the specified side.
 * - Delegates to applySubstitution, which enforces:
 *   * max 3 subs,
 *   * GK-only replaces GK,
 *   * no re-entry (out player is NOT returned to bench).
 * - Also ensures the incoming sub is counted as having "played" for stats.
 */
export async function submitSubstitution(
  matchId: number,
  side: 'home' | 'away',
  outPlayerId: number,
  inPlayerId: number
): Promise<void> {
  const isHome = side === 'home';
  await applySubstitution(matchId, outPlayerId, inPlayerId, isHome);

  // Redundant-safe: mark the incoming sub as "played" immediately.
  // (applySubstitution already does this in matchService; calling again is harmless due to skipDuplicates.)
  await ensureAppearanceRows(matchId, [inPlayerId]);
}

/**
 * Resumes a paused match for this match's save by flipping GameStage to MATCHDAY.
 * (We use stage to pause at halftime; there is no separate isPaused flag in MatchState.)
 */
export async function resumeMatch(matchId: number): Promise<void> {
  const m = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { saveGameId: true },
  });
  if (!m?.saveGameId) return;

  await prisma.gameState.updateMany({
    where: { currentSaveGameId: m.saveGameId },
    data: { gameStage: GameStage.MATCHDAY },
  });
}

/**
 * Performs automatic substitutions for AI teams (injury-first).
 * - Can be called at halftime OR immediately after an injury event.
 * - Non-coached sides only; coached side is left for the user to handle.
 */
export async function runAISubstitutions(matchId: number): Promise<void> {
  // Centralized logic lives in halftimeService.applyAISubstitutions
  await applyAISubstitutions(matchId);
}

/**
 * Convenience helper to auto-substitute injured players right now (during play)
 * for AI-controlled teams only. Call this when you register an INJURY event.
 */
export async function autoSubInjuriesNow(matchId: number): Promise<void> {
  const match = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { saveGameId: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return;

  const gs = await getGameState().catch(() => null);
  const coachTeamId = gs?.coachTeamId ?? null;

  const isHomeAI = coachTeamId ? match.homeTeamId !== coachTeamId : true;
  const isAwayAI = coachTeamId ? match.awayTeamId !== coachTeamId : true;

  // If at least one side is AI, reuse the same AI substitution logic
  // which prioritizes injured players on the field.
  if (isHomeAI || isAwayAI) {
    await applyAISubstitutions(matchId);
  }
}
