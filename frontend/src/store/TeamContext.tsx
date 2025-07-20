import React, { 
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";

import type { Backend } from "@/types/backend";
type SaveGamePlayer = Backend.Player;

/* -------------------------------------------------------------------------- */
/* Internal Types                                                             */
/* -------------------------------------------------------------------------- */

interface TeamState {
  selectedPlayer: SaveGamePlayer | null;
  sellMode: boolean;
  renewMode: boolean;
  currentTeamId: number | null;
  saveGameId: number | null;
  matchdayId: number | null;
}

export interface TeamContextType {
  /** Currently coached team ID (null until set). */
  currentTeamId: number | null;
  setCurrentTeamId: (id: number | null) => void;

  /** Active save-game ID (null until loaded). */
  currentSaveGameId: number | null;
  setCurrentSaveGameId: (id: number | null) => void;

  /** Current matchday ID (null until set). */
  currentMatchdayId: number | null;
  setCurrentMatchdayId: (id: number | null) => void;

  /** Player selection for UI details. */
  selectedPlayer: SaveGamePlayer | null;
  setSelectedPlayer: (player: SaveGamePlayer | null) => void;

  /** Toggle modes for selling or renewing players. */
  sellMode: boolean;
  setSellMode: (on: boolean) => void;
  renewMode: boolean;
  setRenewMode: (on: boolean) => void;

  /** Reset both sell and renew modes. */
  resetModes: () => void;
}

/* -------------------------------------------------------------------------- */
/* Reducer                                                                    */
/* -------------------------------------------------------------------------- */

type Action =
  | { type: "SELECT_PLAYER"; player: SaveGamePlayer | null }
  | { type: "SET_SELL_MODE"; sellMode: boolean }
  | { type: "SET_RENEW_MODE"; renewMode: boolean }
  | { type: "SET_CURRENT_TEAM_ID"; id: number | null }
  | { type: "SET_SAVE_GAME_ID"; id: number | null }
  | { type: "SET_MATCHDAY_ID"; id: number | null }
  | { type: "RESET_MODES" };

const initialState: TeamState = {
  selectedPlayer: null,
  sellMode: false,
  renewMode: false,
  currentTeamId: null,
  saveGameId: null,
  matchdayId: null,
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
    case "SET_MATCHDAY_ID":
      return { ...state, matchdayId: action.id };
    case "RESET_MODES":
      return { ...state, sellMode: false, renewMode: false };
    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Context Setup                                                              */
/* -------------------------------------------------------------------------- */

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: TeamContextType = useMemo(
    () => ({
      currentTeamId: state.currentTeamId,
      setCurrentTeamId: (id) => dispatch({ type: "SET_CURRENT_TEAM_ID", id }),

      currentSaveGameId: state.saveGameId,
      setCurrentSaveGameId: (id) => dispatch({ type: "SET_SAVE_GAME_ID", id }),

      currentMatchdayId: state.matchdayId,
      setCurrentMatchdayId: (id) => dispatch({ type: "SET_MATCHDAY_ID", id }),

      selectedPlayer: state.selectedPlayer,
      setSelectedPlayer: (player) => dispatch({ type: "SELECT_PLAYER", player }),

      sellMode: state.sellMode,
      setSellMode: (sell) => dispatch({ type: "SET_SELL_MODE", sellMode: sell }),

      renewMode: state.renewMode,
      setRenewMode: (renew) => dispatch({ type: "SET_RENEW_MODE", renewMode: renew }),

      resetModes: () => dispatch({ type: "RESET_MODES" }),
    }),
    [state]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useTeamContext(): TeamContextType {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error("useTeamContext must be used within a <TeamProvider>");
  }
  return ctx;
}
