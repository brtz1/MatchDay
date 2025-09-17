// backend/src/services/substitutionService.ts

import prisma from "../utils/prisma";
import {
  SaveGamePlayer,
  MatchEvent as PrismaMatchEvent,
  GameStage,
} from "@prisma/client";
import { applyAISubstitutions } from "./halftimeService";
import { ensureAppearanceRows } from "./appearanceService";
import { getGameState } from "./gameState";

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizePos(p?: string | null): "GK" | "DF" | "MF" | "AT" {
  const s = (p ?? "").toUpperCase();
  if (s === "GK" || s === "G" || s === "GOALKEEPER") return "GK";
  if (s === "DF" || s === "D" || s === "DEF" || s === "DEFENDER") return "DF";
  if (s === "MF" || s === "M" || s === "MID" || s === "MIDFIELDER") return "MF";
  if (s === "AT" || s === "F" || s === "FW" || s === "ATT" || s === "ATTACKER" || s === "ST")
    return "AT";
  return "MF";
}
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/** Utility to fetch a match state's side-specific arrays safely. */
async function getMatchStateForSide(matchId: number, isHomeTeam: boolean) {
  const ms = await prisma.matchState.findUnique({ where: { saveGameMatchId: matchId } });
  if (!ms) throw new Error(`MatchState not found for match ${matchId}`);

  const lineup: number[] = uniq(isHomeTeam ? ms.homeLineup ?? [] : ms.awayLineup ?? []);
  const bench: number[] = uniq(isHomeTeam ? ms.homeReserves ?? [] : ms.awayReserves ?? []);
  const subsMade: number = isHomeTeam ? (ms.homeSubsMade ?? 0) : (ms.awaySubsMade ?? 0);

  return { ms, lineup, bench, subsMade };
}

/** Writes back side-specific arrays/counters. */
async function writeMatchStateForSide(
  matchId: number,
  isHomeTeam: boolean,
  data: {
    newLineup: number[];
    newBench: number[];
    newSubsMade?: number;
  },
) {
  const patch: any = isHomeTeam
    ? {
        homeLineup: data.newLineup,
        homeReserves: data.newBench,
        ...(typeof data.newSubsMade === "number" && {
          homeSubsMade: data.newSubsMade,
          subsRemainingHome: Math.max(0, 3 - data.newSubsMade),
        }),
      }
    : {
        awayLineup: data.newLineup,
        awayReserves: data.newBench,
        ...(typeof data.newSubsMade === "number" && {
          awaySubsMade: data.newSubsMade,
          subsRemainingAway: Math.max(0, 3 - data.newSubsMade),
        }),
      };

  await prisma.matchState.update({
    where: { saveGameMatchId: matchId },
    data: patch,
  });
}

/* -------------------------------------------------------------------------- */
/* Local substitution impl                                                    */
/* -------------------------------------------------------------------------- */
/**
 * Substitution rules (MatchDay!):
 * - Max 3 subs per side.
 * - OUT must currently be on the field; IN must be on the bench.
 * - GK can only be replaced by GK. Prevent two GKs on the field.
 * - ❗️NEW POLICY: The outgoing player is **discarded** for this match
 *   (removed from lineup and reserves) and cannot re-enter.
 */
async function applySubstitutionInternal(
  matchId: number,
  outId: number,
  inId: number,
  isHomeTeam: boolean,
): Promise<void> {
  const { lineup, bench, subsMade } = await getMatchStateForSide(matchId, isHomeTeam);

  if (subsMade >= 3) throw new Error("No substitutions remaining");
  if (!lineup.includes(outId)) throw new Error("Selected outgoing player is not on the field");
  if (!bench.includes(inId)) throw new Error("Selected incoming player is not on the bench");

  // Positions (for GK rules)
  const idsToLoad = uniq([...lineup, outId, inId]);
  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: idsToLoad } },
    select: { id: true, position: true },
  });
  const posById = new Map<number, ReturnType<typeof normalizePos>>(
    players.map((p) => [p.id, normalizePos(p.position)]),
  );

  const outPos = posById.get(outId) ?? "MF";
  const inPos = posById.get(inId) ?? "MF";

  const gkOnField = lineup
    .map((id) => posById.get(id) ?? "MF")
    .filter((pos) => pos === "GK").length;

  if (outPos === "GK" && inPos !== "GK") {
    throw new Error("Goalkeeper can only be substituted by another goalkeeper");
  }
  if (outPos !== "GK" && inPos === "GK") {
    if (gkOnField >= 1) throw new Error("Cannot have two goalkeepers on the field");
  }

  // ❗️Discard OUT completely (do NOT push to bench)
  const newLineup = uniq(lineup.filter((id) => id !== outId).concat(inId));
  const newBench = uniq(
    bench
      .filter((id) => id !== inId) // remove the player who comes in
      .filter((id) => id !== outId), // make sure OUT isn't left in bench by accident
  );

  await writeMatchStateForSide(matchId, isHomeTeam, {
    newLineup,
    newBench,
    newSubsMade: subsMade + 1,
  });
}

/* -------------------------------------------------------------------------- */
/* Public types & fns                                                         */
/* -------------------------------------------------------------------------- */

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
    type: string; // enum as string
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

  const [homePlayers, awayPlayers, events, gs] = await Promise.all([
    prisma.saveGamePlayer.findMany({
      where: { teamId: match.homeTeamId },
      orderBy: { id: "asc" },
    }),
    prisma.saveGamePlayer.findMany({
      where: { teamId: match.awayTeamId },
      orderBy: { id: "asc" },
    }),
    prisma.matchEvent.findMany({
      where: { saveGameMatchId: matchId },
      orderBy: [{ minute: "asc" }, { id: "asc" }],
    }),
    prisma.gameState.findFirst({
      where: { currentSaveGameId: match.saveGameId },
      select: { gameStage: true },
    }),
  ]);

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
 * - Uses local implementation (kept consistent with routes/services).
 * - Also ensures the incoming sub is counted as having "played" for stats.
 * - ❗️Outgoing player is discarded (cannot re-enter this match).
 */
export async function submitSubstitution(
  matchId: number,
  side: "home" | "away",
  outPlayerId: number,
  inPlayerId: number,
): Promise<void> {
  const isHome = side === "home";
  await applySubstitutionInternal(matchId, outPlayerId, inPlayerId, isHome);

  // Mark the incoming sub as "played" immediately (idempotent).
  await ensureAppearanceRows(matchId, [inPlayerId]);
}

/**
 * Remove a player from the match entirely (injury/red/no-sub flows).
 * - The player is deleted from lineup & reserves for the given side.
 * - Does NOT touch subs counters.
 * Use this from your /matchstate/:id/remove-player route and red-card handlers.
 */
export async function removePlayerFromMatch(
  matchId: number,
  isHomeTeam: boolean,
  playerId: number,
): Promise<void> {
  const { lineup, bench } = await getMatchStateForSide(matchId, isHomeTeam);

  const newLineup = lineup.filter((id) => id !== playerId);
  const newBench = bench.filter((id) => id !== playerId);

  await writeMatchStateForSide(matchId, isHomeTeam, { newLineup, newBench });
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
 * - ❗️AI subs also discard the outgoing player (cannot re-enter).
 */
export async function runAISubstitutions(matchId: number): Promise<void> {
  await applyAISubstitutions(matchId);
}

/**
 * Convenience helper to auto-substitute injured players right now (during play)
 * for AI-controlled teams only. Call this when you register an INJURY event.
 * If your AI branch ever removes a player with no sub, call removePlayerFromMatch.
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

  if (isHomeAI || isAwayAI) {
    await applyAISubstitutions(matchId);
  }
}
