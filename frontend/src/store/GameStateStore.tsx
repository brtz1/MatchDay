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

export interface GameStateContextType {
  /** Currently loaded save-game id (or null if no save). */
  saveGameId: number | null;
  setSaveGameId: (id: number | null) => void;

  /** Coach’s active team id (null until a save is loaded). */
  coachTeamId: number | null;
  setCoachTeamId: (id: number | null) => void;

  /** League round in progress (0-38). */
  currentMatchday: number | null;
  refreshGameState: () => Promise<void>;

  /** Global loading flag while we bootstrap. */
  bootstrapping: boolean;
}

/* ------------------------------------------------------------------------- */
/* Context                                                                   */
/* ------------------------------------------------------------------------- */

const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined
);

/* ------------------------------------------------------------------------- */
/* Provider                                                                  */
/* ------------------------------------------------------------------------- */

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [saveGameId, setSaveGameId] = useState<number | null>(null);
  const [coachTeamId, setCoachTeamId] = useState<number | null>(null);
  const [currentMatchday, setCurrentMatchday] = useState<number | null>(
    null
  );
  const [bootstrapping, setBootstrapping] = useState(true);

  /** Fetch latest game-state from backend */
  async function refreshGameState() {
    try {
      const state = await gameStateService.getGameState();
      setCurrentMatchday(state.currentMatchday);
      if (state.saveGameId) setSaveGameId(state.saveGameId);
      if (state.coachTeamId) setCoachTeamId(state.coachTeamId);
    } catch (err) {
      console.error("[GameState] failed to refresh:", err);
    }
  }

  /* ── Initial bootstrap on mount */
  useEffect(() => {
    (async () => {
      await refreshGameState();
      setBootstrapping(false);
    })();
  }, []);

  const value: GameStateContextType = {
    saveGameId,
    setSaveGameId,
    coachTeamId,
    setCoachTeamId,
    currentMatchday,
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
    throw new Error(
      "useGameState must be used inside <GameStateProvider>"
    );
  }
  return ctx;
}
