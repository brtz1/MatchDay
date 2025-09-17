// frontend/src/store/GameStateStore.tsx

import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import gameStateService from "@/services/gameStateService";
import { onStageChanged, offStageChanged } from "@/socket";
import * as Sock from "@/socket"; // ⬅️ for raw socket access to PK events
import { FORMATION_LAYOUTS } from "@/utils/formationHelper";

// PK shared types
import type {
  PkAttempt,
  PkEndPayload,
  PkStartPayload,
  TeamOrder,
} from "@/types/pk";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type GameStage =
  | "ACTION"
  | "MATCHDAY"
  | "HALFTIME"
  | "RESULTS"
  | "STANDINGS"
  | "PENALTIES"; // ⬅️ NEW

export type MatchdayType = "LEAGUE" | "CUP";

export type Position = "GK" | "DF" | "MF" | "AT";

export interface MinimalPlayer {
  id: number;
  position: Position;
  rating: number;
}

export interface GameStateContextType {
  /** Back-compat: your app already uses this name */
  saveGameId: number | null;
  setSaveGameId: (id: number | null) => void;

  /** Mirror of backend field to avoid TS mismatches elsewhere */
  currentSaveGameId: number | null;

  coachTeamId: number | null;
  setCoachTeamId: (id: number | null) => void;

  currentMatchday: number | null;

  gameStage: GameStage;
  setGameStage: (stage: GameStage) => void;

  matchdayType: MatchdayType;
  setMatchdayType: (type: MatchdayType) => void;

  /** True only when backend moved RESULTS -> STANDINGS (post-match flow) */
  cameFromResults: boolean;

  /** Timestamp when we entered STANDINGS after RESULTS (ms since epoch) */
  standingsEnteredAt: number | null;

  /** Call to clear the one-shot flag after handling grace navigation */
  clearCameFromResults: () => void;

  refreshGameState: () => Promise<void>;
  bootstrapping: boolean;

  /** --------------------------- Formation Selection ------------------------ */
  /** Ephemeral visual formation string (not persisted until advance) */
  selectedFormation: string;
  setSelectedFormation: (f: string) => void;

  /** Ephemeral selected ids */
  lineupIds: number[];
  reserveIds: number[];

  /** Max bench size, exposed for UI/validation convenience */
  reserveLimit: number;

  /** Cycle a player's selection (none → lineup → reserve → none → lineup …) */
  cycleSelection: (playerId: number) => void;

  /** Replace current selection entirely */
  setSelection: (lineup: number[], reserves: number[]) => void;

  /** Clear all selection */
  resetSelection: () => void;

  /** Auto-pick selection for a given formation using a player list */
  autopickSelection: (players: MinimalPlayer[], formation: string) => void;

  /** ------------------------------- PK State ------------------------------- */
  /** Active shootout match id (null if none) */
  pkMatchId: number | null;
  /** Pre-ordered takers for each side (when available) */
  pkHome: TeamOrder | null;
  pkAway: TeamOrder | null;
  /** Interleaved attempts so far */
  pkAttempts: PkAttempt[];
  /** End payload when decided */
  pkEnded: PkEndPayload | null;
  /** Clear all PK state (e.g., after ack or when leaving stage) */
  clearPk: () => void;
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function isGameStage(v: unknown): v is GameStage {
  return (
    v === "ACTION" ||
    v === "MATCHDAY" ||
    v === "HALFTIME" ||
    v === "RESULTS" ||
    v === "STANDINGS" ||
    v === "PENALTIES" // ⬅️ NEW
  );
}

function isMatchdayType(v: unknown): v is MatchdayType {
  return v === "LEAGUE" || v === "CUP";
}

const BENCH_MAX = 6; // <-- per your rule (max 6)
const LINEUP_MAX = 11;

/* ------------------------------------------------------------------------- */
/* Context                                                                   */
/* ------------------------------------------------------------------------- */

const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined,
);

/* ------------------------------------------------------------------------- */
/* Provider                                                                  */
/* ------------------------------------------------------------------------- */

interface GameStateProviderProps {
  children: ReactNode;
  autoLoad?: boolean; // Allow skipping auto-refresh
}

type StageChangedPayload = {
  gameStage: GameStage;
  matchdayNumber?: number;
  saveGameId?: number;
};

export function GameStateProvider({
  children,
  autoLoad = true,
}: GameStateProviderProps) {
  const [saveGameId, setSaveGameId] = useState<number | null>(null);
  const [coachTeamId, setCoachTeamId] = useState<number | null>(null);
  const [currentMatchday, setCurrentMatchday] = useState<number | null>(null);
  const [gameStage, setGameStage] = useState<GameStage>("ACTION");
  const [matchdayType, setMatchdayType] =
    useState<MatchdayType>("LEAGUE");
  const [bootstrapping, setBootstrapping] = useState(true);

  // One-shot “came from results” flag + when we entered STANDINGS
  const [cameFromResults, setCameFromResults] = useState(false);
  const [standingsEnteredAt, setStandingsEnteredAt] =
    useState<number | null>(null);

  // Keep last known stage to detect transitions
  const prevStageRef = useRef<GameStage>("ACTION");

  // Ephemeral formation selection
  const [selectedFormation, setSelectedFormation] =
    useState<string>("4-4-2");
  const [lineupIds, setLineupIds] = useState<number[]>([]);
  const [reserveIds, setReserveIds] = useState<number[]>([]);

  // 🔧 Track latest arrays to compute atomic updates safely for cycleSelection
  const lineupRef = useRef<number[]>(lineupIds);
  const reserveRef = useRef<number[]>(reserveIds);
  useEffect(() => {
    lineupRef.current = lineupIds;
  }, [lineupIds]);
  useEffect(() => {
    reserveRef.current = reserveIds;
  }, [reserveIds]);

  // ------------------------------- PK state --------------------------------
  const [pkMatchId, setPkMatchId] = useState<number | null>(null);
  const [pkHome, setPkHome] = useState<TeamOrder | null>(null);
  const [pkAway, setPkAway] = useState<TeamOrder | null>(null);
  const [pkAttempts, setPkAttempts] = useState<PkAttempt[]>([]);
  const [pkEnded, setPkEnded] = useState<PkEndPayload | null>(null);

  const clearPk = () => {
    setPkMatchId(null);
    setPkHome(null);
    setPkAway(null);
    setPkAttempts([]);
    setPkEnded(null);
  };

  const resetState = () => {
    setSaveGameId(null);
    setCoachTeamId(null);
    setCurrentMatchday(null);
    setGameStage("ACTION");
    setMatchdayType("LEAGUE");
    setCameFromResults(false);
    setStandingsEnteredAt(null);
    prevStageRef.current = "ACTION";

    setSelectedFormation("4-4-2");
    setLineupIds([]);
    setReserveIds([]);

    clearPk(); // ⬅️ also reset PK state
  };

  const refreshGameState = async () => {
    try {
      const state = await gameStateService.getGameState();

      // If there is no active save, hard reset the store.
      if (!state || state.currentSaveGameId == null) {
        resetState();
        return;
      }

      // Apply only defined fields from the backend to avoid accidental downgrades.
      setSaveGameId(state.currentSaveGameId ?? null); // mirror of currentSaveGameId
      setCoachTeamId(state.coachTeamId ?? null);
      setCurrentMatchday(
        typeof state.currentMatchday === "number"
          ? state.currentMatchday
          : null,
      );

      const prev = prevStageRef.current;
      const nextStage = isGameStage(state.gameStage)
        ? state.gameStage
        : gameStage;

      if (isGameStage(state.gameStage)) {
        setGameStage(state.gameStage);
      }
      if (isMatchdayType(state.matchdayType)) {
        setMatchdayType(state.matchdayType);
      }

      // Flag only when backend really moved from RESULTS to STANDINGS
      if (prev === "RESULTS" && nextStage === "STANDINGS") {
        setCameFromResults(true);
        setStandingsEnteredAt(Date.now());
      }
      // If we leave STANDINGS to anything else, clear the one-shot flag
      if (prev === "STANDINGS" && nextStage !== "STANDINGS") {
        setCameFromResults(false);
        setStandingsEnteredAt(null);
      }

      // If we leave the PK screen by any backend stage change, wipe PK state
      if (prev === "PENALTIES" && nextStage !== "PENALTIES") {
        clearPk();
      }

      prevStageRef.current = nextStage;
    } catch {
      // Keep previous store values on transient errors
    }
  };

  useEffect(() => {
    if (!autoLoad) {
      setBootstrapping(false);
      return;
    }
    (async () => {
      await refreshGameState();
      setBootstrapping(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  const clearCameFromResults = () => {
    setCameFromResults(false);
    setStandingsEnteredAt(null);
  };

  /* ----------------------------------------------------------------------- */
  /* Socket: keep gameStage (and matchdayNumber) in sync in real time        */
  /* ----------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (p: StageChangedPayload) => {
      const prev = prevStageRef.current;
      const nextStage = isGameStage(p.gameStage) ? p.gameStage : prev;

      // Update store synchronously with socket
      setGameStage(nextStage);

      if (p.saveGameId && p.saveGameId !== (saveGameId ?? undefined)) return;

      if (typeof p.matchdayNumber === "number") {
        setCurrentMatchday(p.matchdayNumber);
      }

      // Maintain cameFromResults flag based on transitions
      if (prev === "RESULTS" && nextStage === "STANDINGS") {
        setCameFromResults(true);
        setStandingsEnteredAt(Date.now());
      }
      if (prev === "STANDINGS" && nextStage !== "STANDINGS") {
        setCameFromResults(false);
        setStandingsEnteredAt(null);
      }

      // Leaving PK stage by stage-changed? clear PK state
      if (prev === "PENALTIES" && nextStage !== "PENALTIES") {
        clearPk();
      }

      prevStageRef.current = nextStage;
    };

    onStageChanged(handler);
    return () => {
      offStageChanged(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------------------------------------------------- */
  /* Socket: Penalties flow (subscribe to pk-start / pk-attempt / pk-end)    */
  /* ----------------------------------------------------------------------- */
  useEffect(() => {
    const raw: any =
      (Sock as any)?.socket ||
      (Sock as any)?.getSocket?.() ||
      (window as any)?.socket;

    if (!raw?.on) return;

    const handlePkStart = (payload: PkStartPayload) => {
      setPkMatchId(payload.matchId);
      setPkHome(payload.home);
      setPkAway(payload.away);
      setPkAttempts([]);
      setPkEnded(null);

      // Only take over the screen if the coached team is involved
      const coachedInvolved =
        (coachTeamId && payload.home?.id === coachTeamId) ||
        (coachTeamId && payload.away?.id === coachTeamId);

      if (coachedInvolved) {
        setGameStage("PENALTIES");
        prevStageRef.current = "PENALTIES";
      }
    };

    const handlePkAttempt = (att: PkAttempt) => {
      // Keep interleaved list; consumers can group by isHome/shotIndex
      setPkAttempts((prev) => [...prev, att]);
    };

    const handlePkEnd = (end: PkEndPayload) => {
      setPkEnded(end);
      // We do NOT auto-change stage here; the backend should emit stage-changed
      // after /pk/ack (or immediately for AI-only shootouts).
    };

    raw.on("pk-start", handlePkStart);
    raw.on("pk-attempt", handlePkAttempt);
    raw.on("pk-end", handlePkEnd);

    return () => {
      raw.off?.("pk-start", handlePkStart);
      raw.off?.("pk-attempt", handlePkAttempt);
      raw.off?.("pk-end", handlePkEnd);
    };
  }, [coachTeamId]);

  // --------------------------- Selection helpers ----------------------------

  /**
   * Endless cycle with limits:
   * none → lineup → reserve → none → lineup …
   * - Prevents duplicates
   * - Atomic updates (reads refs, sets both lists together)
   * - Formation-agnostic; validation (exactly 1 GK, etc.) happens on advance CTA
   */
  const cycleSelection = (playerId: number) => {
    // read the latest values
    const curLineup = lineupRef.current;
    const curReserve = reserveRef.current;

    const inLineup = curLineup.includes(playerId);
    const inReserve = curReserve.includes(playerId);

    let nextLineup = curLineup.slice();
    let nextReserve = curReserve.slice();

    if (!inLineup && !inReserve) {
      // none → lineup (no caps here; validate on advance)
      nextLineup = [playerId, ...nextLineup];
    } else if (inLineup) {
      // lineup → reserve
      nextLineup = nextLineup.filter((id) => id !== playerId);
      if (!nextReserve.includes(playerId)) {
        nextReserve = [playerId, ...nextReserve];
      }
    } else {
      // reserve → none
      nextReserve = nextReserve.filter((id) => id !== playerId);
    }

    // safety: de-dup cross lists
    const luSet = new Set(nextLineup);
    nextReserve = nextReserve.filter((id) => !luSet.has(id));

    // Debug — remove once verified
    console.debug(
      "[cycleSelection]",
      { playerId, inLineup, inReserve },
      { nextLineup, nextReserve },
    );

    setLineupIds(nextLineup);
    setReserveIds(nextReserve);
  };

  const setSelection = (lineup: number[], reserves: number[]) => {
    const lu = [...new Set(lineup)].slice(0, LINEUP_MAX);
    const rs = [...new Set(reserves)]
      .filter((id) => !lu.includes(id))
      .slice(0, BENCH_MAX);
    setLineupIds(lu);
    setReserveIds(rs);
  };

  const resetSelection = () => {
    setLineupIds([]);
    setReserveIds([]);
  };

  /**
   * Autopick that DOES NOT cross-fill positions.
   * - Select up to the formation's requested count PER position (capped by what's available).
   * - If you can't reach 11 due to shortages (e.g., only 2 MFs), leave fewer than 11.
   * - Bench picks best-of-rest up to BENCH_MAX (prefer 1 GK if available).
   */
  const autopickSelection = (
    players: MinimalPlayer[],
    formation: string,
  ) => {
    const layout =
      FORMATION_LAYOUTS[formation] ?? FORMATION_LAYOUTS["4-4-2"];

    const byPos = {
      GK: players
        .filter((p) => p.position === "GK")
        .sort((a, b) => b.rating - a.rating),
      DF: players
        .filter((p) => p.position === "DF")
        .sort((a, b) => b.rating - a.rating),
      MF: players
        .filter((p) => p.position === "MF")
        .sort((a, b) => b.rating - a.rating),
      AT: players
        .filter((p) => p.position === "AT")
        .sort((a, b) => b.rating - a.rating),
    };

    const lineup: number[] = [];
    const reserves: number[] = [];

    // GK / DF / MF / AT starters — strictly per position, capped by availability
    lineup.push(...byPos.GK.slice(0, layout.GK).map((p) => p.id));
    lineup.push(...byPos.DF.slice(0, layout.DF).map((p) => p.id));
    lineup.push(...byPos.MF.slice(0, layout.MF).map((p) => p.id));
    lineup.push(...byPos.AT.slice(0, layout.AT).map((p) => p.id));

    // ❌ Do NOT top-up to 11 with other positions.

    // Bench: up to BENCH_MAX best of the rest (prefer 1 GK if available)
    const chosen = new Set(lineup);
    const rest = [...players]
      .filter((p) => !chosen.has(p.id))
      .sort((a, b) => b.rating - a.rating);

    const bench: number[] = [];
    const benchGK = rest.find((p) => p.position === "GK");
    if (benchGK) bench.push(benchGK.id);
    for (const p of rest) {
      if (bench.length >= BENCH_MAX) break;
      if (benchGK && p.id === benchGK.id) continue;
      bench.push(p.id);
    }

    setSelectedFormation(formation);
    setSelection(lineup, bench);
  };

  const value: GameStateContextType = {
    saveGameId,
    setSaveGameId,

    // expose explicit currentSaveGameId to match backend naming in some callers
    currentSaveGameId: saveGameId,

    coachTeamId,
    setCoachTeamId,
    currentMatchday,
    gameStage,
    setGameStage,
    matchdayType,
    setMatchdayType,
    cameFromResults,
    standingsEnteredAt,
    clearCameFromResults,
    refreshGameState,
    bootstrapping,

    selectedFormation,
    setSelectedFormation,
    lineupIds,
    reserveIds,
    reserveLimit: BENCH_MAX,
    cycleSelection,
    setSelection,
    resetSelection,
    autopickSelection,

    // PK state
    pkMatchId,
    pkHome,
    pkAway,
    pkAttempts,
    pkEnded,
    clearPk,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

/* ------------------------------------------------------------------------- */
/* Hook                                                                      */
/* ------------------------------------------------------------------------- */

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) {
    throw new Error("useGameState must be used inside <GameStateProvider>");
  }
  return ctx;
}
