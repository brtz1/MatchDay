import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, } from "react";
import gameStateService from "@/services/gameStateService";
/* ------------------------------------------------------------------------- */
/* Context                                                                   */
/* ------------------------------------------------------------------------- */
const GameStateContext = createContext(undefined);
/* ------------------------------------------------------------------------- */
/* Provider                                                                  */
/* ------------------------------------------------------------------------- */
export function GameStateProvider({ children }) {
    const [saveGameId, setSaveGameId] = useState(null);
    const [coachTeamId, setCoachTeamId] = useState(null);
    const [currentMatchday, setCurrentMatchday] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true);
    /** Fetch latest game-state from backend */
    async function refreshGameState() {
        try {
            const state = await gameStateService.getGameState();
            setCurrentMatchday(state.currentMatchday);
            if (state.saveGameId)
                setSaveGameId(state.saveGameId);
            if (state.coachTeamId)
                setCoachTeamId(state.coachTeamId);
        }
        catch (err) {
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
    const value = {
        saveGameId,
        setSaveGameId,
        coachTeamId,
        setCoachTeamId,
        currentMatchday,
        refreshGameState,
        bootstrapping,
    };
    return (_jsx(GameStateContext.Provider, { value: value, children: children }));
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
//# sourceMappingURL=GameStateStore.js.map