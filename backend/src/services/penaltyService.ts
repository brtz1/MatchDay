// backend/src/services/penaltyService.ts

import prisma from "../utils/prisma";
import { MatchEventType } from "@prisma/client";
import {
  broadcastPkStart,
  broadcastPkAttempt,
  broadcastPkEnd,
  broadcastPenaltyResult,
  broadcastMatchEvent,
  broadcastMatchTick,
} from "../sockets/broadcast";
import { enterPenalties, exitPenalties } from "./gameState";

/* ----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------- */

export type Side = "HOME" | "AWAY";

export type PKPlayer = {
  id: number;
  name: string;
  position?: string | null;
  rating?: number;
};

export type PKStartPayload = {
  matchId: number;
  firstShooter: Side;
  bestOf?: number;
  homeOrder: PKPlayer[];
  awayOrder: PKPlayer[];
  homeQueue?: PKPlayer[];
  awayQueue?: PKPlayer[];
};

export type PKAttemptOutcome = "SCORED" | "MISSED" | "SAVED";

export type SimulateShootoutParams = {
  /** SaveGameMatch.id */
  saveGameMatchId: number;
  /** true when coached team in match → interactive, else instant */
  interactive: boolean;
  /** delay (ms) between attempts for interactive flow (default: 700ms) */
  delayMs?: number;
};

export type SimulateShootoutResult = {
  matchId: number;
  winner: Side;
  homeScore: number;
  awayScore: number;
  rounds: number;
  suddenDeath: boolean;
  firstShooter: Side;
};

/* ----------------------------------------------------------------------------
 * Interactive PK snapshot (for GET /pk/state)
 * ---------------------------------------------------------------------------- */

export type InteractivePkSnapshot = {
  matchId: number;
  firstShooter: Side;
  bestOf: number;
  homeOrder: PKPlayer[];
  awayOrder: PKPlayer[];
  homeQueue: PKPlayer[];
  awayQueue: PKPlayer[];
  homeScore: number;
  awayScore: number;
  attemptNumber: number; // total attempts taken so far (1-based on the last emitted attempt)
  roundNumber: number;   // completed pairs in regulation [0..bestOf]
  suddenDeath: boolean;
  currentShooter: Side;  // side that will shoot next
  finished?: boolean;
  winner?: Side;
};

const interactivePkBySave = new Map<number, InteractivePkSnapshot>();

export function getInteractivePkState(saveGameId: number): InteractivePkSnapshot | null {
  const s = interactivePkBySave.get(saveGameId);
  return s ?? null;
}

function setInteractiveState(saveGameId: number, snap: InteractivePkSnapshot) {
  interactivePkBySave.set(saveGameId, snap);
}

function clearInteractiveState(saveGameId: number) {
  interactivePkBySave.delete(saveGameId);
}

/* ----------------------------------------------------------------------------
 * Constants / utils (anti-deadlock)
 * ---------------------------------------------------------------------------- */

const MAX_TOTAL_ATTEMPTS = 60; // 30 pairs max; then coin-flip
const BEST_OF = 5;             // standard FIFA 5

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function coinFlipFirstShooter(matchId: number): Side {
  const r = Math.sin(matchId * 9301 + 49297) * 233280;
  return (r - Math.floor(r)) < 0.5 ? "HOME" : "AWAY";
}

function randomWinner(): Side {
  return Math.random() < 0.5 ? "HOME" : "AWAY";
}

/* ----------------------------------------------------------------------------
 * Helpers (rosters, ratings, probability)
 * ---------------------------------------------------------------------------- */

function extractOnPitchIds(state: any, side: Side): number[] {
  if (!state) return [];
  const lineupKey = side === "HOME" ? "homeLineup" : "awayLineup";
  if (Array.isArray(state?.[lineupKey])) return state[lineupKey] as number[];

  const onPitchKey = side === "HOME" ? "homeOnPitch" : "awayOnPitch";
  if (Array.isArray(state?.[onPitchKey])) return state[onPitchKey] as number[];

  if (Array.isArray(state?.lineup?.[side === "HOME" ? "home" : "away"])) {
    return state.lineup[side === "HOME" ? "home" : "away"] as number[];
  }
  return [];
}

async function getExcludedIds(saveGameMatchId: number): Promise<Set<number>> {
  const evs = await prisma.matchEvent.findMany({
    where: {
      saveGameMatchId,
      type: { in: [MatchEventType.RED, MatchEventType.INJURY] },
    },
    select: { saveGamePlayerId: true },
  });
  const s = new Set<number>();
  for (const e of evs) {
    if (typeof e.saveGamePlayerId === "number") s.add(e.saveGamePlayerId);
  }
  return s;
}

function positionBucket(p?: string | null): number {
  if (!p) return 9;
  const pos = p.toUpperCase();
  if (pos === "AT") return 0;
  if (pos === "MF") return 1;
  if (pos === "DF") return 2;
  if (pos === "GK") return 99;
  return 9;
}

function sortShooters(a: PKPlayer, b: PKPlayer): number {
  const ba = positionBucket(a.position);
  const bb = positionBucket(b.position);
  if (ba !== bb) return ba - bb;

  const ra = typeof a.rating === "number" ? a.rating : -1;
  const rb = typeof b.rating === "number" ? b.rating : -1;
  if (ra !== rb) return rb - ra;

  const na = (a.name || "").localeCompare(b.name || "");
  if (na !== 0) return na;

  return (a.id || 0) - (b.id || 0);
}

async function getGkRatingForSide(matchState: any, side: Side): Promise<number> {
  const lineupIds = extractOnPitchIds(matchState, side);
  if (lineupIds.length === 0) return 40;

  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: lineupIds } },
    select: { position: true, rating: true },
  });

  const gk = players.find((p) => (p.position || "").toUpperCase() === "GK");
  if (gk) return gk.rating ?? 40;

  const min = players.reduce((acc, p) => Math.min(acc, p.rating ?? 40), 40);
  return min;
}

function pkScoreProbability(shooterRating: number, gkRating: number): number {
  const p = 0.75 + (shooterRating - gkRating) * 0.01;
  return clamp(p, 0.60, 0.92);
}

/* ----------------------------------------------------------------------------
 * Order selection
 * ---------------------------------------------------------------------------- */

export async function selectShootoutOrder(saveGameMatchId: number): Promise<{
  matchId: number;
  firstShooter: Side;
  bestOf: number;
  homeOrder: PKPlayer[];
  awayOrder: PKPlayer[];
  homeQueue: PKPlayer[];
  awayQueue: PKPlayer[];
  saveGameId: number;
}> {
  const match = await prisma.saveGameMatch.findUnique({
    where: { id: saveGameMatchId },
    include: {
      state: true,
      saveGame: { select: { id: true } },
    },
  });
  if (!match) throw new Error(`Match ${saveGameMatchId} not found`);
  const saveGameId = match.saveGameId;

  const excluded = await getExcludedIds(saveGameMatchId);

  const homeOnPitch = extractOnPitchIds(match.state, "HOME");
  const awayOnPitch = extractOnPitchIds(match.state, "AWAY");

  const [homePlayers, awayPlayers] = await Promise.all([
    prisma.saveGamePlayer.findMany({
      where: { id: { in: homeOnPitch } },
      select: { id: true, name: true, position: true, rating: true },
    }),
    prisma.saveGamePlayer.findMany({
      where: { id: { in: awayOnPitch } },
      select: { id: true, name: true, position: true, rating: true },
    }),
  ]);

  const isEligible = (p: { id: number; position?: string | null }) => {
    const pos = (p.position || "").toUpperCase();
    return pos !== "GK" && !excluded.has(p.id);
  };

  const homeElig = homePlayers.filter(isEligible).map<PKPlayer>((p) => p).sort(sortShooters);
  const awayElig = awayPlayers.filter(isEligible).map<PKPlayer>((p) => p).sort(sortShooters);

  const bestOf = BEST_OF;
  const homeOrder = homeElig.slice(0, Math.min(bestOf, homeElig.length));
  const awayOrder = awayElig.slice(0, Math.min(bestOf, awayElig.length));
  const homeQueue = homeElig.slice(homeOrder.length);
  const awayQueue = awayElig.slice(awayOrder.length);

  const firstShooter = coinFlipFirstShooter(match.id);

  return {
    matchId: match.id,
    saveGameId,
    firstShooter,
    bestOf,
    homeOrder,
    awayOrder,
    homeQueue,
    awayQueue,
  };
}

/* ----------------------------------------------------------------------------
 * Scoreboard finalize helpers
 * ---------------------------------------------------------------------------- */

async function finalizeWinnerOnScoreboard(
  matchId: number,
  winner: Side
): Promise<{ updatedHome: number; updatedAway: number }> {
  const base = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { homeGoals: true, awayGoals: true },
  });
  const updatedHome = (base?.homeGoals ?? 0) + (winner === "HOME" ? 1 : 0);
  const updatedAway = (base?.awayGoals ?? 0) + (winner === "AWAY" ? 1 : 0);

  await prisma.saveGameMatch.update({
    where: { id: matchId },
    data: {
      homeGoals: updatedHome,
      awayGoals: updatedAway,
      isPlayed: true, // decided
    },
  });

  return { updatedHome, updatedAway };
}

/* ----------------------------------------------------------------------------
 * Shootout simulation (robust) + snapshot updates
 * ---------------------------------------------------------------------------- */

export async function simulateShootout(
  params: SimulateShootoutParams
): Promise<SimulateShootoutResult> {
  const { saveGameMatchId, interactive, delayMs = 700 } = params;

  const order = await selectShootoutOrder(saveGameMatchId);
  const {
    matchId,
    saveGameId,
    firstShooter,
    bestOf,
    homeOrder,
    awayOrder,
    homeQueue,
    awayQueue,
  } = order;

  const match = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    include: { state: true },
  });
  if (!match) throw new Error(`Match ${matchId} not found`);

  // If zero eligible shooters on both sides → coin-flip to avoid deadlock.
  const noShooters =
    homeOrder.length + awayOrder.length + homeQueue.length + awayQueue.length === 0;

  if (interactive) {
    try { await enterPenalties(saveGameId); } catch {}
    try {
      broadcastMatchTick(saveGameId, {
        matchId,
        minute: (match.state as any)?.minute ?? 120,
        homeGoals: match.homeGoals ?? 0,
        awayGoals: match.awayGoals ?? 0,
        id: matchId,
        phase: "PENS",
      });
    } catch {}
  }

  if (noShooters) {
    const winner = randomWinner();

    if (interactive) {
      // Seed minimal snapshot so FE can render something
      setInteractiveState(saveGameId, {
        matchId,
        firstShooter,
        bestOf,
        homeOrder: [],
        awayOrder: [],
        homeQueue: [],
        awayQueue: [],
        homeScore: 0,
        awayScore: 0,
        attemptNumber: 0,
        roundNumber: 0,
        suddenDeath: false,
        currentShooter: firstShooter,
        finished: true,
        winner,
      });

      try {
        broadcastPkStart(saveGameId, {
          matchId,
          firstShooter,
          bestOf,
          homeOrder: [],
          awayOrder: [],
          homeQueue: [],
          awayQueue: [],
        });
      } catch {}
    }

    await finalizeWinnerOnScoreboard(matchId, winner);

    if (interactive) {
      try {
        broadcastPkEnd(saveGameId, {
          matchId,
          winner,
          homeScore: 0,
          awayScore: 0,
          rounds: 0,
          suddenDeath: false,
        });
      } catch {}
      try { await exitPenalties(saveGameId, { to: "RESULTS" }); } catch {}
      clearInteractiveState(saveGameId);
    }

    return {
      matchId,
      winner,
      homeScore: 0,
      awayScore: 0,
      rounds: 0,
      suddenDeath: false,
      firstShooter,
    };
  }

  const homeGkRating = await getGkRatingForSide(match.state, "HOME");
  const awayGkRating = await getGkRatingForSide(match.state, "AWAY");

  if (interactive) {
    // Initial snapshot
    setInteractiveState(saveGameId, {
      matchId,
      firstShooter,
      bestOf,
      homeOrder,
      awayOrder,
      homeQueue,
      awayQueue,
      homeScore: 0,
      awayScore: 0,
      attemptNumber: 0,
      roundNumber: 0,
      suddenDeath: false,
      currentShooter: firstShooter,
    });

    try {
      const startPayload: PKStartPayload = {
        matchId,
        firstShooter,
        bestOf,
        homeOrder,
        awayOrder,
        homeQueue,
        awayQueue,
      };
      broadcastPkStart(saveGameId, startPayload);
    } catch {}
  }

  let homeScore = 0;
  let awayScore = 0;
  let attemptNumber = 0;
  let roundNumber = 0; // completed pairs in regulation
  let suddenDeath = false;

  let homeIdx = 0;
  let awayIdx = 0;
  let homeSD = 0;
  let awaySD = 0;

  const pickShooter = (side: Side): PKPlayer | null => {
    if (roundNumber < bestOf) {
      return side === "HOME" ? (homeOrder[homeIdx] || null) : (awayOrder[awayIdx] || null);
    }
    // sudden-death / recycling
    if (side === "HOME") {
      if (homeSD < homeQueue.length) return homeQueue[homeSD] || null;
      const all = [...homeOrder, ...homeQueue];
      if (all.length === 0) return null;
      return all[(homeSD - homeQueue.length) % all.length] || null;
    } else {
      if (awaySD < awayQueue.length) return awayQueue[awaySD] || null;
      const all = [...awayOrder, ...awayQueue];
      if (all.length === 0) return null;
      return all[(awaySD - awayQueue.length) % all.length] || null;
    }
  };

  const updateSnapshot = (nextShooter: Side) => {
    if (!interactive) return;
    const snap = interactivePkBySave.get(saveGameId);
    if (!snap) return;
    setInteractiveState(saveGameId, {
      ...snap,
      homeScore,
      awayScore,
      attemptNumber,
      roundNumber,
      suddenDeath,
      currentShooter: nextShooter,
    });
  };

  const attempt = async (side: Side): Promise<PKAttemptOutcome> => {
    const shooter = pickShooter(side);
    attemptNumber += 1;

    // No shooter available → forced MISS
    if (!shooter) {
      if (interactive) {
        try {
          broadcastPkAttempt(saveGameId, {
            matchId,
            isHomeTeam: side === "HOME",
            shooter: { id: -1, name: "N/A" },
            attemptNumber,
            roundNumber: Math.max(1, roundNumber),
            outcome: "MISSED",
            homeScore,
            awayScore,
          });
        } catch {}
      }
      return "MISSED";
    }

    const shooterRating = shooter.rating ?? 40;
    const gkRating = side === "HOME" ? awayGkRating : homeGkRating;
    const pGoal = pkScoreProbability(shooterRating, gkRating);
    const r = Math.random();
    const scored = r < pGoal;

    let outcome: PKAttemptOutcome = scored ? "SCORED" : "SAVED";
    if (!scored && Math.random() < 0.2) outcome = "MISSED";

    if (scored) {
      if (side === "HOME") homeScore += 1;
      else awayScore += 1;
    }

    if (interactive) {
      try {
        broadcastPkAttempt(saveGameId, {
          matchId,
          isHomeTeam: side === "HOME",
          shooter,
          attemptNumber,
          roundNumber: Math.max(1, roundNumber),
          outcome,
          homeScore,
          awayScore,
        });
      } catch {}
    }

    if (roundNumber < bestOf) {
      if (side === "HOME") homeIdx += 1;
      else awayIdx += 1;
    } else {
      if (side === "HOME") homeSD += 1;
      else awaySD += 1;
    }

    return outcome;
  };

  const earlyDecided = (): boolean => {
    if (roundNumber < bestOf) {
      const takenHome = homeIdx;
      const takenAway = awayIdx;
      const remHome = bestOf - takenHome;
      const remAway = bestOf - takenAway;

      if (homeScore > awayScore + remAway) return true;
      if (awayScore > homeScore + remHome) return true;
    }
    return false;
  };

  let current: Side = firstShooter;

  while (true) {
    await attempt(current);

    // Update snapshot for "next shooter"
    updateSnapshot(current === "HOME" ? "AWAY" : "HOME");

    // Hard cap: avoid infinite sudden-death ties
    if (attemptNumber >= MAX_TOTAL_ATTEMPTS) {
      break;
    }

    if (current === "AWAY") {
      // completed a pair in regulation
      if (roundNumber < bestOf) {
        roundNumber += 1;
        if (earlyDecided()) break;
      } else if (suddenDeath) {
        if (homeScore !== awayScore) break; // pair decided in SD
      }
    }

    // Alternate
    current = current === "HOME" ? "AWAY" : "HOME";

    // Transition to sudden death: right after the away kick that completed bestOf
    if (roundNumber === bestOf && current === firstShooter && !suddenDeath) {
      if (homeScore !== awayScore) break;
      suddenDeath = true;
      updateSnapshot(current); // snapshot suddenDeath flip
    }

    if (interactive && delayMs > 0) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  // Decide winner (if still tied due to cap)
  let winner: Side;
  if (homeScore === awayScore) {
    winner = randomWinner();
  } else {
    winner = homeScore > awayScore ? "HOME" : "AWAY";
  }

  await finalizeWinnerOnScoreboard(matchId, winner);

  if (interactive) {
    // mark finished in snapshot for any last /pk/state poll
    const snap = interactivePkBySave.get(saveGameId);
    if (snap) {
      setInteractiveState(saveGameId, {
        ...snap,
        homeScore,
        awayScore,
        attemptNumber,
        roundNumber,
        suddenDeath,
        finished: true,
        winner,
      });
    }

    try {
      broadcastPkEnd(saveGameId, {
        matchId,
        winner,
        homeScore,
        awayScore,
        rounds: attemptNumber,
        suddenDeath,
      });
    } catch {}

    try { await exitPenalties(saveGameId, { to: "RESULTS" }); } catch {}

    // snapshot no longer needed once we leave PENALTIES
    clearInteractiveState(saveGameId);
  }

  return {
    matchId,
    winner,
    homeScore,
    awayScore,
    rounds: attemptNumber,
    suddenDeath,
    firstShooter,
  };
}

/* ----------------------------------------------------------------------------
 * Single in-match penalty resolution (not a shootout)
 * ---------------------------------------------------------------------------- */

export async function resolveMatchPenalty(params: {
  matchId: number;
  shooterId: number;
  isHome: boolean;
}): Promise<{
  outcome: "GOAL" | "MISS" | "SAVE";
  description: string;
  homeGoals: number;
  awayGoals: number;
}> {
  const { matchId, shooterId, isHome } = params;

  const match = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    include: { state: true, saveGame: true },
  });
  if (!match) throw new Error(`Match ${matchId} not found`);

  const saveGameId = match.saveGameId;

  const shooter = await prisma.saveGamePlayer.findUnique({
    where: { id: shooterId },
    select: { id: true, name: true, position: true, rating: true },
  });
  if (!shooter) throw new Error(`Shooter ${shooterId} not found`);

  const defendingSide: Side = isHome ? "AWAY" : "HOME";
  const gkRating = await getGkRatingForSide(match.state, defendingSide);

  const shooterRating = shooter.rating ?? 40;
  const pGoal = pkScoreProbability(shooterRating, gkRating);

  const r = Math.random();
  const scored = r < pGoal;

  let outcome: "GOAL" | "MISS" | "SAVE" = scored ? "GOAL" : "SAVE";
  if (!scored && Math.random() < 0.25) outcome = "MISS";

  let newHome = match.homeGoals ?? 0;
  let newAway = match.awayGoals ?? 0;

  let description = "";
  if (outcome === "GOAL") {
    if (isHome) newHome += 1;
    else newAway += 1;
    description = `Penalty scored by ${shooter.name}`;
  } else if (outcome === "SAVE") {
    description = `Penalty saved! ${shooter.name} denied`;
  } else {
    description = `Penalty missed by ${shooter.name}`;
  }

  if (outcome === "GOAL") {
    await prisma.saveGameMatch.update({
      where: { id: matchId },
      data: {
        homeGoals: newHome,
        awayGoals: newAway,
      },
    });

    try {
      await prisma.matchEvent.create({
        data: {
          saveGameMatchId: matchId,
          minute: (match.state as any)?.minute ?? 0,
          type: MatchEventType.GOAL,
          description,
          saveGamePlayerId: shooter.id,
        },
      });
    } catch {}

    try {
      broadcastMatchEvent(saveGameId, {
        matchId,
        minute: (match.state as any)?.minute ?? 0,
        type: MatchEventType.GOAL,
        description,
        player: { id: shooter.id, name: shooter.name },
        isHomeTeam: isHome,
      });
    } catch {}
  }

  try {
    broadcastPenaltyResult(saveGameId, {
      matchId,
      minute: (match.state as any)?.minute ?? 0,
      isHomeTeam: isHome,
      shooter: {
        id: shooter.id,
        name: shooter.name,
        position: shooter.position ?? undefined,
        rating: shooter.rating ?? undefined,
      },
      outcome,
      description,
      homeGoals: newHome,
      awayGoals: newAway,
    });
  } catch {}

  return { outcome, description, homeGoals: newHome, awayGoals: newAway };
}
