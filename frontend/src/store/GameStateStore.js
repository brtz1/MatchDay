import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useRef, } from "react";
import gameStateService from "@/services/gameStateService";
import { onStageChanged, offStageChanged } from "@/socket";
import * as Sock from "@/socket"; // ⬅️ for raw socket access to PK events
import { FORMATION_LAYOUTS } from "@/utils/formationHelper";
/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */
function isGameStage(v) {
    return (v === "ACTION" ||
        v === "MATCHDAY" ||
        v === "HALFTIME" ||
        v === "RESULTS" ||
        v === "STANDINGS" ||
        v === "PENALTIES" // ⬅️ NEW
    );
}
function isMatchdayType(v) {
    return v === "LEAGUE" || v === "CUP";
}
const BENCH_MAX = 6; // <-- per your rule (max 6)
const LINEUP_MAX = 11;
/* ------------------------------------------------------------------------- */
/* Context                                                                   */
/* ------------------------------------------------------------------------- */
const GameStateContext = createContext(undefined);
export function GameStateProvider({ children, autoLoad = true, }) {
    const [saveGameId, setSaveGameId] = useState(null);
    const [coachTeamId, setCoachTeamId] = useState(null);
    const [currentMatchday, setCurrentMatchday] = useState(null);
    const [gameStage, setGameStage] = useState("ACTION");
    const [matchdayType, setMatchdayType] = useState("LEAGUE");
    const [bootstrapping, setBootstrapping] = useState(true);
    // One-shot “came from results” flag + when we entered STANDINGS
    const [cameFromResults, setCameFromResults] = useState(false);
    const [standingsEnteredAt, setStandingsEnteredAt] = useState(null);
    // Keep last known stage to detect transitions
    const prevStageRef = useRef("ACTION");
    // Ephemeral formation selection
    const [selectedFormation, setSelectedFormation] = useState("4-4-2");
    const [lineupIds, setLineupIds] = useState([]);
    const [reserveIds, setReserveIds] = useState([]);
    // 🔧 Track latest arrays to compute atomic updates safely for cycleSelection
    const lineupRef = useRef(lineupIds);
    const reserveRef = useRef(reserveIds);
    useEffect(() => {
        lineupRef.current = lineupIds;
    }, [lineupIds]);
    useEffect(() => {
        reserveRef.current = reserveIds;
    }, [reserveIds]);
    // ------------------------------- PK state --------------------------------
    const [pkMatchId, setPkMatchId] = useState(null);
    const [pkHome, setPkHome] = useState(null);
    const [pkAway, setPkAway] = useState(null);
    const [pkAttempts, setPkAttempts] = useState([]);
    const [pkEnded, setPkEnded] = useState(null);
    const clearPk = () => {
        setPkMatchId(null);
        setPkHome(null);
        setPkAway(null);
        setPkAttempts([]);
        setPkEnded(null);
    };
    const resetState = () => {
        setSaveGameId(null);
        setCoachTeamId(null);
        setCurrentMatchday(null);
        setGameStage("ACTION");
        setMatchdayType("LEAGUE");
        setCameFromResults(false);
        setStandingsEnteredAt(null);
        prevStageRef.current = "ACTION";
        setSelectedFormation("4-4-2");
        setLineupIds([]);
        setReserveIds([]);
        clearPk(); // ⬅️ also reset PK state
    };
    const refreshGameState = async () => {
        try {
            const state = await gameStateService.getGameState();
            // If there is no active save, hard reset the store.
            if (!state || state.currentSaveGameId == null) {
                resetState();
                return;
            }
            // Apply only defined fields from the backend to avoid accidental downgrades.
            setSaveGameId(state.currentSaveGameId ?? null); // mirror of currentSaveGameId
            setCoachTeamId(state.coachTeamId ?? null);
            setCurrentMatchday(typeof state.currentMatchday === "number"
                ? state.currentMatchday
                : null);
            const prev = prevStageRef.current;
            const nextStage = isGameStage(state.gameStage)
                ? state.gameStage
                : gameStage;
            if (isGameStage(state.gameStage)) {
                setGameStage(state.gameStage);
            }
            if (isMatchdayType(state.matchdayType)) {
                setMatchdayType(state.matchdayType);
            }
            // Flag only when backend really moved from RESULTS to STANDINGS
            if (prev === "RESULTS" && nextStage === "STANDINGS") {
                setCameFromResults(true);
                setStandingsEnteredAt(Date.now());
            }
            // If we leave STANDINGS to anything else, clear the one-shot flag
            if (prev === "STANDINGS" && nextStage !== "STANDINGS") {
                setCameFromResults(false);
                setStandingsEnteredAt(null);
            }
            // If we leave the PK screen by any backend stage change, wipe PK state
            if (prev === "PENALTIES" && nextStage !== "PENALTIES") {
                clearPk();
            }
            prevStageRef.current = nextStage;
        }
        catch {
            // Keep previous store values on transient errors
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoLoad]);
    const clearCameFromResults = () => {
        setCameFromResults(false);
        setStandingsEnteredAt(null);
    };
    /* ----------------------------------------------------------------------- */
    /* Socket: keep gameStage (and matchdayNumber) in sync in real time        */
    /* ----------------------------------------------------------------------- */
    useEffect(() => {
        const handler = (p) => {
            const prev = prevStageRef.current;
            const nextStage = isGameStage(p.gameStage) ? p.gameStage : prev;
            // Update store synchronously with socket
            setGameStage(nextStage);
            if (p.saveGameId && p.saveGameId !== (saveGameId ?? undefined))
                return;
            if (typeof p.matchdayNumber === "number") {
                setCurrentMatchday(p.matchdayNumber);
            }
            // Maintain cameFromResults flag based on transitions
            if (prev === "RESULTS" && nextStage === "STANDINGS") {
                setCameFromResults(true);
                setStandingsEnteredAt(Date.now());
            }
            if (prev === "STANDINGS" && nextStage !== "STANDINGS") {
                setCameFromResults(false);
                setStandingsEnteredAt(null);
            }
            // Leaving PK stage by stage-changed? clear PK state
            if (prev === "PENALTIES" && nextStage !== "PENALTIES") {
                clearPk();
            }
            prevStageRef.current = nextStage;
        };
        onStageChanged(handler);
        return () => {
            offStageChanged(handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    /* ----------------------------------------------------------------------- */
    /* Socket: Penalties flow (subscribe to pk-start / pk-attempt / pk-end)    */
    /* ----------------------------------------------------------------------- */
    useEffect(() => {
        const raw = Sock?.socket ||
            Sock?.getSocket?.() ||
            window?.socket;
        if (!raw?.on)
            return;
        const handlePkStart = (payload) => {
            setPkMatchId(payload.matchId);
            setPkHome(payload.home);
            setPkAway(payload.away);
            setPkAttempts([]);
            setPkEnded(null);
            // Only take over the screen if the coached team is involved
            const coachedInvolved = (coachTeamId && payload.home?.id === coachTeamId) ||
                (coachTeamId && payload.away?.id === coachTeamId);
            if (coachedInvolved) {
                setGameStage("PENALTIES");
                prevStageRef.current = "PENALTIES";
            }
        };
        const handlePkAttempt = (att) => {
            // Keep interleaved list; consumers can group by isHome/shotIndex
            setPkAttempts((prev) => [...prev, att]);
        };
        const handlePkEnd = (end) => {
            setPkEnded(end);
            // We do NOT auto-change stage here; the backend should emit stage-changed
            // after /pk/ack (or immediately for AI-only shootouts).
        };
        raw.on("pk-start", handlePkStart);
        raw.on("pk-attempt", handlePkAttempt);
        raw.on("pk-end", handlePkEnd);
        return () => {
            raw.off?.("pk-start", handlePkStart);
            raw.off?.("pk-attempt", handlePkAttempt);
            raw.off?.("pk-end", handlePkEnd);
        };
    }, [coachTeamId]);
    // --------------------------- Selection helpers ----------------------------
    /**
     * Endless cycle with limits:
     * none → lineup → reserve → none → lineup …
     * - Prevents duplicates
     * - Atomic updates (reads refs, sets both lists together)
     * - Formation-agnostic; validation (exactly 1 GK, etc.) happens on advance CTA
     */
    const cycleSelection = (playerId) => {
        // read the latest values
        const curLineup = lineupRef.current;
        const curReserve = reserveRef.current;
        const inLineup = curLineup.includes(playerId);
        const inReserve = curReserve.includes(playerId);
        let nextLineup = curLineup.slice();
        let nextReserve = curReserve.slice();
        if (!inLineup && !inReserve) {
            // none → lineup (no caps here; validate on advance)
            nextLineup = [playerId, ...nextLineup];
        }
        else if (inLineup) {
            // lineup → reserve
            nextLineup = nextLineup.filter((id) => id !== playerId);
            if (!nextReserve.includes(playerId)) {
                nextReserve = [playerId, ...nextReserve];
            }
        }
        else {
            // reserve → none
            nextReserve = nextReserve.filter((id) => id !== playerId);
        }
        // safety: de-dup cross lists
        const luSet = new Set(nextLineup);
        nextReserve = nextReserve.filter((id) => !luSet.has(id));
        // Debug — remove once verified
        console.debug("[cycleSelection]", { playerId, inLineup, inReserve }, { nextLineup, nextReserve });
        setLineupIds(nextLineup);
        setReserveIds(nextReserve);
    };
    const setSelection = (lineup, reserves) => {
        const lu = [...new Set(lineup)].slice(0, LINEUP_MAX);
        const rs = [...new Set(reserves)]
            .filter((id) => !lu.includes(id))
            .slice(0, BENCH_MAX);
        setLineupIds(lu);
        setReserveIds(rs);
    };
    const resetSelection = () => {
        setLineupIds([]);
        setReserveIds([]);
    };
    /**
     * Autopick that DOES NOT cross-fill positions.
     * - Select up to the formation's requested count PER position (capped by what's available).
     * - If you can't reach 11 due to shortages (e.g., only 2 MFs), leave fewer than 11.
     * - Bench picks best-of-rest up to BENCH_MAX (prefer 1 GK if available).
     */
    const autopickSelection = (players, formation) => {
        const layout = FORMATION_LAYOUTS[formation] ?? FORMATION_LAYOUTS["4-4-2"];
        const byPos = {
            GK: players
                .filter((p) => p.position === "GK")
                .sort((a, b) => b.rating - a.rating),
            DF: players
                .filter((p) => p.position === "DF")
                .sort((a, b) => b.rating - a.rating),
            MF: players
                .filter((p) => p.position === "MF")
                .sort((a, b) => b.rating - a.rating),
            AT: players
                .filter((p) => p.position === "AT")
                .sort((a, b) => b.rating - a.rating),
        };
        const lineup = [];
        const reserves = [];
        // GK / DF / MF / AT starters — strictly per position, capped by availability
        lineup.push(...byPos.GK.slice(0, layout.GK).map((p) => p.id));
        lineup.push(...byPos.DF.slice(0, layout.DF).map((p) => p.id));
        lineup.push(...byPos.MF.slice(0, layout.MF).map((p) => p.id));
        lineup.push(...byPos.AT.slice(0, layout.AT).map((p) => p.id));
        // ❌ Do NOT top-up to 11 with other positions.
        // Bench: up to BENCH_MAX best of the rest (prefer 1 GK if available)
        const chosen = new Set(lineup);
        const rest = [...players]
            .filter((p) => !chosen.has(p.id))
            .sort((a, b) => b.rating - a.rating);
        const bench = [];
        const benchGK = rest.find((p) => p.position === "GK");
        if (benchGK)
            bench.push(benchGK.id);
        for (const p of rest) {
            if (bench.length >= BENCH_MAX)
                break;
            if (benchGK && p.id === benchGK.id)
                continue;
            bench.push(p.id);
        }
        setSelectedFormation(formation);
        setSelection(lineup, bench);
    };
    const value = {
        saveGameId,
        setSaveGameId,
        // expose explicit currentSaveGameId to match backend naming in some callers
        currentSaveGameId: saveGameId,
        coachTeamId,
        setCoachTeamId,
        currentMatchday,
        gameStage,
        setGameStage,
        matchdayType,
        setMatchdayType,
        cameFromResults,
        standingsEnteredAt,
        clearCameFromResults,
        refreshGameState,
        bootstrapping,
        selectedFormation,
        setSelectedFormation,
        lineupIds,
        reserveIds,
        reserveLimit: BENCH_MAX,
        cycleSelection,
        setSelection,
        resetSelection,
        autopickSelection,
        // PK state
        pkMatchId,
        pkHome,
        pkAway,
        pkAttempts,
        pkEnded,
        clearPk,
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