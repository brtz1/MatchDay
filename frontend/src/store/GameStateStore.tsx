// frontend/src/store/GameStateStore.tsx

import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import gameStateService from "@/services/gameStateService";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type GameStage = "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";
export type MatchdayType = "LEAGUE" | "CUP";

export interface GameStateContextType {
  saveGameId: number | null;
  setSaveGameId: (id: number | null) => void;

  coachTeamId: number | null;
  setCoachTeamId: (id: number | null) => void;

  currentMatchday: number | null;

  gameStage: GameStage;
  setGameStage: (stage: GameStage) => void;

  matchdayType: MatchdayType;
  setMatchdayType: (type: MatchdayType) => void;

  refreshGameState: () => Promise<void>;
  bootstrapping: boolean;
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

  const resetState = () => {
    setSaveGameId(null);
    setCoachTeamId(null);
    setCurrentMatchday(null);
    setGameStage("ACTION");
    setMatchdayType("LEAGUE");
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
      setSaveGameId(state.currentSaveGameId ?? null);
      setCoachTeamId(state.coachTeamId ?? null);
      setCurrentMatchday(
        typeof state.currentMatchday === "number" ? state.currentMatchday : null
      );

      if (isGameStage(state.gameStage)) {
        setGameStage(state.gameStage);
      }

      if (isMatchdayType(state.matchdayType)) {
        setMatchdayType(state.matchdayType);
      }
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
  }, [autoLoad]);

  const value: GameStateContextType = {
    saveGameId,
    setSaveGameId,
    coachTeamId,
    setCoachTeamId,
    currentMatchday,
    gameStage,
    setGameStage,
    matchdayType,
    setMatchdayType,
    refreshGameState,
    bootstrapping,
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
