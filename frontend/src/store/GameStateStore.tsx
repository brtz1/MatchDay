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
/* Context                                                                   */
/* ------------------------------------------------------------------------- */

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

/* ------------------------------------------------------------------------- */
/* Provider                                                                  */
/* ------------------------------------------------------------------------- */

interface GameStateProviderProps {
  children: ReactNode;
  autoLoad?: boolean; // ✅ Allow skipping auto-refresh
}

export function GameStateProvider({ children, autoLoad = true }: GameStateProviderProps) {
  const [saveGameId, setSaveGameId] = useState<number | null>(null);
  const [coachTeamId, setCoachTeamId] = useState<number | null>(null);
  const [currentMatchday, setCurrentMatchday] = useState<number | null>(null);
  const [gameStage, setGameStage] = useState<GameStage>("ACTION");
  const [matchdayType, setMatchdayType] = useState<MatchdayType>("LEAGUE");
  const [bootstrapping, setBootstrapping] = useState(true);

  const refreshGameState = async () => {
    try {
      const state = await gameStateService.getGameState();
      console.log("[GameState] Loaded:", state);

      if (!state || !state.currentSaveGameId) {
        setSaveGameId(null);
        setCoachTeamId(null);
        setCurrentMatchday(null);
        setGameStage("ACTION");
        setMatchdayType("LEAGUE");
        return;
      }

      setSaveGameId(state.currentSaveGameId);
      setCoachTeamId(state.coachTeamId ?? null);
      setCurrentMatchday(state.currentMatchday ?? 1);
      setGameStage(state.gameStage ?? "ACTION");
      setMatchdayType(state.matchdayType ?? "LEAGUE");
    } catch (err) {
      console.error("[GameState] failed to refresh:", err);
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
