import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import { SaveGamePlayer } from "@prisma/client";

/** -----------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------- */

// Internal state managed by the reducer
interface TeamState {
  selectedPlayer: SaveGamePlayer | null;
  sellMode: boolean;
  renewMode: boolean;
  currentTeamId: number | null;
  saveGameId: number | null;
  selectedTeamId: number | null;
}

// Public contract exposed by the context – do **not** change without
// updating the rest of the app.
export interface TeamContextType {
  /** Currently highlighted player in the roster table. */
  selectedPlayer: SaveGamePlayer | null;
  setSelectedPlayer: (player: SaveGamePlayer | null) => void;

  /** When true, TeamRoster enters the sell‑price UI for the selected player. */
  sellMode: boolean;
  setSellMode: (v: boolean) => void;

  /** When true, TeamRoster shows contract‑renew UI for the selected player. */
  renewMode: boolean;
  setRenewMode: (v: boolean) => void;

  /** Coach’s team id in the active save game. */
  currentTeamId: number | null;
  setCurrentTeamId: (id: number | null) => void;

  /** The save‑game id currently loaded. */
  saveGameId: number | null;
  setSaveGameId: (id: number | null) => void;

  /** Optionally track which other team’s roster is being viewed. */
  selectedTeamId: number | null;
  setSelectedTeamId: (id: number | null) => void;

  /** Handy helper to reset all temporary UI modes. */
  resetModes: () => void;
}

/** -----------------------------------------------------------------------
 * Reducer helpers
 * -------------------------------------------------------------------- */

type Action =
  | { type: "SELECT_PLAYER"; player: SaveGamePlayer | null }
  | { type: "SET_SELL_MODE"; sellMode: boolean }
  | { type: "SET_RENEW_MODE"; renewMode: boolean }
  | { type: "SET_CURRENT_TEAM_ID"; id: number | null }
  | { type: "SET_SAVE_GAME_ID"; id: number | null }
  | { type: "SET_SELECTED_TEAM_ID"; id: number | null }
  | { type: "RESET_MODES" };

const initialState: TeamState = {
  selectedPlayer: null,
  sellMode: false,
  renewMode: false,
  currentTeamId: null,
  saveGameId: null,
  selectedTeamId: null,
};

function reducer(state: TeamState, action: Action): TeamState {
  switch (action.type) {
    case "SELECT_PLAYER":
      return { ...state, selectedPlayer: action.player };
    case "SET_SELL_MODE":
      return { ...state, sellMode: action.sellMode };
    case "SET_RENEW_MODE":
      return { ...state, renewMode: action.renewMode };
    case "SET_CURRENT_TEAM_ID":
      return { ...state, currentTeamId: action.id };
    case "SET_SAVE_GAME_ID":
      return { ...state, saveGameId: action.id };
    case "SET_SELECTED_TEAM_ID":
      return { ...state, selectedTeamId: action.id };
    case "RESET_MODES":
      return { ...state, sellMode: false, renewMode: false };
    default:
      return state;
  }
}

/** -----------------------------------------------------------------------
 * Context setup
 * -------------------------------------------------------------------- */

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Memoise the context value so consumers only re‑render when a relevant
  // piece of state actually changes.
  const value: TeamContextType = useMemo(() => {
    return {
      selectedPlayer: state.selectedPlayer,
      setSelectedPlayer: (player) =>
        dispatch({ type: "SELECT_PLAYER", player }),

      sellMode: state.sellMode,
      setSellMode: (sellMode) =>
        dispatch({ type: "SET_SELL_MODE", sellMode }),

      renewMode: state.renewMode,
      setRenewMode: (renewMode) =>
        dispatch({ type: "SET_RENEW_MODE", renewMode }),

      currentTeamId: state.currentTeamId,
      setCurrentTeamId: (id) =>
        dispatch({ type: "SET_CURRENT_TEAM_ID", id }),

      saveGameId: state.saveGameId,
      setSaveGameId: (id) => dispatch({ type: "SET_SAVE_GAME_ID", id }),

      selectedTeamId: state.selectedTeamId,
      setSelectedTeamId: (id) =>
        dispatch({ type: "SET_SELECTED_TEAM_ID", id }),

      resetModes: () => dispatch({ type: "RESET_MODES" }),
    };
  }, [state]);

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  );
}

/** -----------------------------------------------------------------------
 * Hook
 * -------------------------------------------------------------------- */

export function useTeamContext(): TeamContextType {
  const ctx = useContext(TeamContext);
  if (ctx === undefined) {
    throw new Error("useTeamContext must be used within a <TeamProvider>");
  }
  return ctx;
}
