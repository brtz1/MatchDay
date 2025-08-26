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

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type GameStage = "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";
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

  /** Explicit mirror of backend field to avoid TS mismatches elsewhere */
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

  /** Cycle a player's selection (none → lineup → reserve → none → lineup …) */
  cycleSelection: (playerId: number) => void;

  /** Replace current selection entirely */
  setSelection: (lineup: number[], reserves: number[]) => void;

  /** Clear all selection */
  resetSelection: () => void;

  /** Auto-pick selection for a given formation using a player list */
  autopickSelection: (players: MinimalPlayer[], formation: string) => void;
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function isGameStage(v: unknown): v is GameStage {
  return v === "ACTION" || v === "MATCHDAY" || v === "HALFTIME" || v === "RESULTS" || v === "STANDINGS";
}

function isMatchdayType(v: unknown): v is MatchdayType {
  return v === "LEAGUE" || v === "CUP";
}

/** Supported formation layouts (❌ removed 4-2-3-1) */
const FORMATION_LAYOUTS: Record<string, { GK: number; DF: number; MF: number; AT: number }> = {
  "4-4-2": { GK: 1, DF: 4, MF: 4, AT: 2 },
  "4-3-3": { GK: 1, DF: 4, MF: 3, AT: 3 },
  "3-5-2": { GK: 1, DF: 3, MF: 5, AT: 2 },
  "5-3-2": { GK: 1, DF: 5, MF: 3, AT: 2 },
  "3-4-3": { GK: 1, DF: 3, MF: 4, AT: 3 },
};

const BENCH_MAX = 8;

/* ------------------------------------------------------------------------- */
/* Context                                                                   */
/* ------------------------------------------------------------------------- */

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

/* ------------------------------------------------------------------------- */
/* Provider                                                                  */
/* ------------------------------------------------------------------------- */

interface GameStateProviderProps {
  children: ReactNode;
  autoLoad?: boolean; // Allow skipping auto-refresh
}

export function GameStateProvider({ children, autoLoad = true }: GameStateProviderProps) {
  const [saveGameId, setSaveGameId] = useState<number | null>(null);
  const [coachTeamId, setCoachTeamId] = useState<number | null>(null);
  const [currentMatchday, setCurrentMatchday] = useState<number | null>(null);
  const [gameStage, setGameStage] = useState<GameStage>("ACTION");
  const [matchdayType, setMatchdayType] = useState<MatchdayType>("LEAGUE");
  const [bootstrapping, setBootstrapping] = useState(true);

  // One-shot “came from results” flag + when we entered STANDINGS
  const [cameFromResults, setCameFromResults] = useState(false);
  const [standingsEnteredAt, setStandingsEnteredAt] = useState<number | null>(null);

  // Keep last known stage to detect transitions
  const prevStageRef = useRef<GameStage>("ACTION");

  // Ephemeral formation selection
  const [selectedFormation, setSelectedFormation] = useState<string>("4-4-2");
  const [lineupIds, setLineupIds] = useState<number[]>([]);
  const [reserveIds, setReserveIds] = useState<number[]>([]);

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
  };

  const refreshGameState = async () => {
    try {
      const state = await gameStateService.getGameState();
      console.log("[GameState] Loaded:", state);

      // If there is no active save, hard reset the store.
      if (!state || state.currentSaveGameId == null) {
        resetState();
        return;
      }

      // Apply only defined fields from the backend to avoid accidental downgrades.
      setSaveGameId(state.currentSaveGameId ?? null); // mirror of currentSaveGameId
      setCoachTeamId(state.coachTeamId ?? null);
      setCurrentMatchday(
        typeof state.currentMatchday === "number" ? state.currentMatchday : null
      );

      const prev = prevStageRef.current;
      const nextStage = isGameStage(state.gameStage) ? state.gameStage : gameStage;

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

      prevStageRef.current = nextStage;
    } catch (err) {
      // Network / server hiccup: keep existing store values so we don't bounce routes.
      console.error("[GameState] failed to refresh (keeping previous state):", err);
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

  // --------------------------- Selection helpers ----------------------------

  /**
   * Endless cycle: none → lineup → reserve → none → lineup …
   * Uses current arrays (not functional reducers) because we apply both sets in one click.
   */
  const cycleSelection = (playerId: number) => {
    const inLineup = lineupIds.includes(playerId);
    const inRes = reserveIds.includes(playerId);

    if (!inLineup && !inRes) {
      // none → lineup
      setLineupIds([...lineupIds, playerId]);
      return;
    }
    if (inLineup) {
      // lineup → reserve
      setLineupIds(lineupIds.filter((id) => id !== playerId));
      setReserveIds([...reserveIds, playerId]);
      return;
    }
    if (inRes) {
      // reserve → none
      setReserveIds(reserveIds.filter((id) => id !== playerId));
      return;
    }
  };

  const setSelection = (lineup: number[], reserves: number[]) => {
    setLineupIds([...new Set(lineup)]);
    setReserveIds([...new Set(reserves.filter((id) => !lineup.includes(id)))]);
  };

  const resetSelection = () => {
    setLineupIds([]);
    setReserveIds([]);
  };

  /**
   * Autopick that DOES NOT cross-fill positions.
   * - Select up to the formation's requested count PER position (capped by what's available).
   * - If you can't reach 11 due to shortages (e.g., only 2 MFs), leave fewer than 11.
   * - Bench still picks best-of-rest up to BENCH_MAX (optionally preferring 1 GK).
   */
  const autopickSelection = (players: MinimalPlayer[], formation: string) => {
    const layout = FORMATION_LAYOUTS[formation] ?? FORMATION_LAYOUTS["4-4-2"];

    const byPos = {
      GK: players.filter((p) => p.position === "GK").sort((a, b) => b.rating - a.rating),
      DF: players.filter((p) => p.position === "DF").sort((a, b) => b.rating - a.rating),
      MF: players.filter((p) => p.position === "MF").sort((a, b) => b.rating - a.rating),
      AT: players.filter((p) => p.position === "AT").sort((a, b) => b.rating - a.rating),
    };

    const lineup: number[] = [];
    const reserves: number[] = [];

    // GK / DF / MF / AT starters — strictly per position, capped by availability
    lineup.push(...byPos.GK.slice(0, layout.GK).map((p) => p.id));
    lineup.push(...byPos.DF.slice(0, layout.DF).map((p) => p.id));
    lineup.push(...byPos.MF.slice(0, layout.MF).map((p) => p.id));
    lineup.push(...byPos.AT.slice(0, layout.AT).map((p) => p.id));

    // ❌ Do NOT top-up to 11 with other positions.
    // User must manage shortages to reach 11 (and exactly 1 GK) before advancing.

    // Bench: up to 8 best of the rest (prefer 1 GK if available)
    const chosen = new Set(lineup);
    const rest = [...players].filter((p) => !chosen.has(p.id)).sort((a, b) => b.rating - a.rating);

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
    cycleSelection,
    setSelection,
    resetSelection,
    autopickSelection,
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
