import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer, useMemo, useEffect, } from "react";
const COACH_TEAM_KEY = "coachTeamId";
const initialState = {
    selectedPlayer: null,
    sellMode: false,
    renewMode: false,
    // Restore from localStorage on initial load
    currentTeamId: (() => {
        const stored = localStorage.getItem(COACH_TEAM_KEY);
        return stored && !isNaN(Number(stored)) && Number(stored) > 0
            ? Number(stored)
            : null;
    })(),
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
    // Keep localStorage in sync with state (for currentTeamId)
    useEffect(() => {
        if (state.currentTeamId && typeof state.currentTeamId === "number" && !isNaN(state.currentTeamId) && state.currentTeamId > 0) {
            localStorage.setItem(COACH_TEAM_KEY, String(state.currentTeamId));
        }
        else {
            localStorage.removeItem(COACH_TEAM_KEY);
        }
    }, [state.currentTeamId]);
    // Always use this setter throughout your app!
    const setCurrentTeamId = (id) => {
        if (id && typeof id === "number" && !isNaN(id) && id > 0) {
            localStorage.setItem(COACH_TEAM_KEY, String(id));
            dispatch({ type: "SET_CURRENT_TEAM_ID", id });
        }
        else {
            localStorage.removeItem(COACH_TEAM_KEY);
            dispatch({ type: "SET_CURRENT_TEAM_ID", id: null });
        }
    };
    const value = useMemo(() => ({
        currentTeamId: state.currentTeamId,
        setCurrentTeamId,
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
    }), [state]);
    return _jsx(TeamContext.Provider, { value: value, children: children });
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