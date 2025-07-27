import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, } from "react";
import gameStateService from "@/services/gameStateService";
/* ------------------------------------------------------------------------- */
/* Context                                                                   */
/* ------------------------------------------------------------------------- */
const GameStateContext = createContext(undefined);
export function GameStateProvider({ children, autoLoad = true }) {
    const [saveGameId, setSaveGameId] = useState(null);
    const [coachTeamId, setCoachTeamId] = useState(null);
    const [currentMatchday, setCurrentMatchday] = useState(null);
    const [gameStage, setGameStage] = useState("ACTION");
    const [matchdayType, setMatchdayType] = useState("LEAGUE");
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
        }
        catch (err) {
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
    const value = {
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