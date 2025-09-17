import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
// frontend/src/routes/ProtectedMatchdayRoute.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useGameState } from "@/store/GameStateStore";
import api from "@/services/axios";
/**
 * Route guard that:
 * - Resolves a save id (from store or /gamestate) before deciding.
 * - Allows MATCHDAY, HALFTIME, RESULTS, PENALTIES.
 * - Gives a short grace window (up to 3s) to let ACTION → MATCHDAY flip.
 * - Never sends you to Title unless we are 100% sure there is NO save.
 */
export default function ProtectedMatchdayRoute({ children }) {
    const { state } = useLocation();
    const { gameStage, coachTeamId, saveGameId, currentSaveGameId, } = useGameState();
    // resolve save id once
    const storeSaveId = (typeof saveGameId === "number" ? saveGameId : undefined) ??
        (typeof currentSaveGameId === "number" ? currentSaveGameId : undefined);
    const [resolvedSaveId, setResolvedSaveId] = useState(undefined);
    useEffect(() => {
        let cancelled = false;
        if (typeof storeSaveId === "number") {
            setResolvedSaveId(storeSaveId);
            return;
        }
        (async () => {
            try {
                const { data } = await api.get("/gamestate");
                if (!cancelled)
                    setResolvedSaveId(data.currentSaveGameId ?? null);
            }
            catch {
                if (!cancelled)
                    setResolvedSaveId(undefined); // unknown → do not redirect
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [storeSaveId]);
    const allowed = useMemo(() => new Set([
        "MATCHDAY",
        "HALFTIME",
        "RESULTS",
        "PENALTIES", // ← include PK shootout stage
    ]), []);
    // Grace window to let server flip ACTION→MATCHDAY after you click the button
    const [graceActive, setGraceActive] = useState(false);
    const graceTimer = useRef(null);
    // Type-safe check for `state.fromFormation` without `any`
    function hasFromFormation(s) {
        return !!s && typeof s === "object" && "fromFormation" in s;
    }
    useEffect(() => {
        const hinted = hasFromFormation(state) && !!state.fromFormation;
        if (!hinted || graceActive)
            return;
        setGraceActive(true);
        graceTimer.current = window.setTimeout(() => setGraceActive(false), 3000);
        return () => {
            if (graceTimer.current)
                window.clearTimeout(graceTimer.current);
        };
    }, [state, graceActive]);
    // Decide what to do
    // 1) Unknown save id? render children (let the page show its own loader)
    if (resolvedSaveId === undefined)
        return _jsx(_Fragment, { children: children });
    // 2) Definitely no save → Title
    if (resolvedSaveId === null)
        return _jsx(Navigate, { to: "/", replace: true });
    // 3) Known save: accept allowed stages; during grace, also accept ACTION
    if (gameStage && (allowed.has(gameStage) || (graceActive && gameStage === "ACTION"))) {
        return _jsx(_Fragment, { children: children });
    }
    // 4) If stage isn’t allowed and no grace, send to the team page (not Title)
    if (coachTeamId != null) {
        return _jsx(Navigate, { to: `/team/${coachTeamId}`, replace: true });
    }
    return _jsx(Navigate, { to: "/", replace: true });
}
//# sourceMappingURL=ProtectedMatchdayRoute.js.map