import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer, useMemo, } from "react";
const initialState = {
    selectedPlayer: null,
    sellMode: false,
    renewMode: false,
    currentTeamId: null,
    saveGameId: null,
    matchdayId: null,
};
function reducer(state, action) {
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
const TeamContext = createContext(undefined);
export function TeamProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = useMemo(() => {
        return {
            currentTeamId: state.currentTeamId ?? 0,
            setCurrentTeamId: (id) => dispatch({ type: "SET_CURRENT_TEAM_ID", id }),
            currentSaveGameId: state.saveGameId,
            setCurrentSaveGameId: (id) => dispatch({ type: "SET_SAVE_GAME_ID", id }),
            currentMatchdayId: state.matchdayId,
            setCurrentMatchdayId: (id) => dispatch({ type: "SET_MATCHDAY_ID", id }),
            selectedPlayer: state.selectedPlayer,
            setSelectedPlayer: (player) => dispatch({ type: "SELECT_PLAYER", player }),
            sellMode: state.sellMode,
            setSellMode: (sellMode) => dispatch({ type: "SET_SELL_MODE", sellMode }),
            renewMode: state.renewMode,
            setRenewMode: (renewMode) => dispatch({ type: "SET_RENEW_MODE", renewMode }),
            resetModes: () => dispatch({ type: "RESET_MODES" }),
        };
    }, [state]);
    return (_jsx(TeamContext.Provider, { value: value, children: children }));
}
/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */
export function useTeamContext() {
    const ctx = useContext(TeamContext);
    if (!ctx) {
        throw new Error("useTeamContext must be used within a <TeamProvider>");
    }
    return ctx;
}
//# sourceMappingURL=TeamContext.js.map