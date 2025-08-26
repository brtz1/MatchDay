import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { getTeamMatchInfo } from "@/services/axios";
import { useSocketEvent } from "@/hooks/useSocket";
import { useRequiredStage } from "@/hooks/useRequiredStage";
import { useGameState } from "@/store/GameStateStore";
import { AppCard } from "@/components/common/AppCard";
import MatchTicker from "@/components/MatchBroadcast/MatchTicker";
import HalfTimePopup from "@/pages/HalfTimePopup";
import { ProgressBar } from "@/components/common/ProgressBar";
import { isAxiosError } from "axios";
import { standingsUrl, cupUrl } from "@/utils/paths";
/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function MatchDayLivePage() {
    // Route guard: allow MATCHDAY / HALFTIME / RESULTS (freeze) to render
    useRequiredStage(["MATCHDAY", "HALFTIME", "RESULTS"], { redirectTo: "/", graceMs: 4000 });
    const navigate = useNavigate();
    const { currentMatchday, matchdayType, coachTeamId, gameStage, bootstrapping } = useGameState();
    // Mirror server stage from socket so UI reacts instantly (store may lag)
    const [liveStage, setLiveStage] = useState(gameStage);
    const [matches, setMatches] = useState([]);
    const [eventsByMatch, setEventsByMatch] = useState({});
    const [popupMatchId, setPopupMatchId] = useState(null);
    const [isHomeTeamForPopup, setIsHomeTeamForPopup] = useState(true);
    const [lineup, setLineup] = useState([]);
    const [bench, setBench] = useState([]);
    const [subsRemaining, setSubsRemaining] = useState(3);
    const [pauseReason, setPauseReason] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Server-authoritative clock
    const [serverMinute, setServerMinute] = useState(0);
    /* ---------------------------------------------------------------- */
    /* Sync local liveStage from socket                                  */
    /* ---------------------------------------------------------------- */
    useSocketEvent("stage-changed", (p) => {
        setLiveStage(p.gameStage);
    });
    // Also keep it in sync if store updates out-of-band (poller, etc.)
    useEffect(() => {
        if (gameStage !== liveStage)
            setLiveStage(gameStage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameStage]);
    /* ---------------------------------------------------------------- */
    /* Initial data load (fixtures + existing events)                    */
    /* ---------------------------------------------------------------- */
    useEffect(() => {
        if (bootstrapping)
            return;
        if (!currentMatchday)
            return;
        let disposed = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [{ data: fetchedMatches }, { data: groupedEvents }] = await Promise.all([
                    api.get("/matches", { params: { matchday: currentMatchday } }),
                    api.get(`/match-events/by-matchday/${currentMatchday}`),
                ]);
                if (disposed)
                    return;
                setMatches(fetchedMatches);
                setEventsByMatch(groupedEvents ?? {});
                // minute comes from socket; do not infer from REST
            }
            catch (e) {
                console.error("[MatchDayLive] Failed to load matchday data:", e);
                if (!disposed)
                    setError("Failed to load live matchday data.");
            }
            finally {
                if (!disposed)
                    setLoading(false);
            }
        })();
        return () => { disposed = true; };
    }, [bootstrapping, currentMatchday]);
    /* ---------------------------------------------------------------- */
    /* Helper: set stage via API (HALFTIME/MATCHDAY toggles)             */
    /* ---------------------------------------------------------------- */
    const setStage = useCallback(async (stage) => {
        try {
            const { data: gs } = await api.get("/gamestate");
            const saveGameId = gs.currentSaveGameId;
            if (!saveGameId)
                return;
            await api.post("/matchday/set-stage", { saveGameId, stage });
        }
        catch (e) {
            console.warn("[MatchDayLive] setStage failed:", e);
        }
    }, []);
    /* ---------------------------------------------------------------- */
    /* Auto open halftime popup for the coached team (45')               */
    /* ---------------------------------------------------------------- */
    useEffect(() => {
        const stage = liveStage; // prefer socket stage
        if (stage !== "HALFTIME")
            return;
        if (!coachTeamId || !currentMatchday)
            return;
        if (popupMatchId != null)
            return; // already open
        (async () => {
            try {
                // 1) Find active save
                const { data: gs } = await api.get("/gamestate");
                const saveGameId = gs.currentSaveGameId;
                if (!saveGameId)
                    return;
                // 2) Ask BE which match this team is in (scoped by save & matchday)
                //    Correct endpoint: /api/matchday/team-match-info?saveGameId=...&matchday=...&teamId=...
                let matchId = null;
                let isHomeTeam = true;
                try {
                    const info = await getTeamMatchInfo(saveGameId, currentMatchday, coachTeamId);
                    matchId = info.matchId;
                    isHomeTeam = info.isHomeTeam;
                }
                catch (err) {
                    // Graceful 404: fall back to local fixtures list
                    if (isAxiosError(err) && err.response?.status === 404) {
                        const fallback = matches.find((m) => m.homeTeam.id === coachTeamId || m.awayTeam.id === coachTeamId);
                        if (fallback) {
                            matchId = fallback.id;
                            isHomeTeam = fallback.homeTeam.id === coachTeamId;
                            console.warn("[MatchDayLive] team-match-info 404; fell back to local match list:", { matchId, isHomeTeam });
                        }
                        else {
                            console.warn("[MatchDayLive] team-match-info 404 and no fallback match found in local state.");
                            return; // nothing to open
                        }
                    }
                    else {
                        console.warn("[MatchDayLive] Failed to auto-open halftime popup:", err);
                        return;
                    }
                }
                // 3) Open popup
                setPopupMatchId(matchId);
                setIsHomeTeamForPopup(isHomeTeam);
                setPauseReason((prev) => prev ?? "HALFTIME"); // default reason if none set
                // 4) Preload formation for the coached side
                try {
                    const side = isHomeTeam ? "home" : "away";
                    const { data } = await api.get(`/matchstate/${matchId}`, { params: { side } });
                    setLineup(data.lineup);
                    setBench(data.bench);
                    setSubsRemaining(data.subsRemaining);
                }
                catch (preErr) {
                    if (!isAxiosError(preErr) || preErr.response?.status !== 404) {
                        console.warn("[MatchDayLive] Unable to preload halftime state:", preErr);
                    }
                }
            }
            catch (e) {
                console.warn("[MatchDayLive] Failed halftime auto-open:", e);
            }
        })();
        // include `matches` so fallback works if BE 404s
    }, [liveStage, coachTeamId, currentMatchday, popupMatchId, matches]);
    /* ---------------------------------------------------------------- */
    /* Server-initiated pause (GK injury/red with bench GK, injuries)    */
    /* Coach-only guard to avoid popping for other teams                 */
    /* ---------------------------------------------------------------- */
    useSocketEvent("pause-request", async (p) => {
        // Guard: only open for the coached side
        const m = matches.find((x) => x.id === p.matchId);
        if (m && typeof coachTeamId === "number") {
            const teamId = p.isHomeTeam ? m.homeTeam.id : m.awayTeam.id;
            if (teamId !== coachTeamId) {
                return; // not the user's team; ignore
            }
        }
        // Move UI into a paused state and open the correct match popup.
        setLiveStage("HALFTIME");
        setPopupMatchId(p.matchId);
        setIsHomeTeamForPopup(p.isHomeTeam);
        setPauseReason(p.reason);
        // Preload state for that side
        try {
            const side = p.isHomeTeam ? "home" : "away";
            const { data } = await api.get(`/matchstate/${p.matchId}`, { params: { side } });
            setLineup(data.lineup);
            setBench(data.bench);
            setSubsRemaining(data.subsRemaining);
        }
        catch {
            /* popup still opens; user can retry inside it */
        }
    });
    /* ---------------------------------------------------------------- */
    /* Substitutions                                                     */
    /* ---------------------------------------------------------------- */
    const handleSub = useCallback(async ({ out, in: inId }) => {
        if (popupMatchId == null)
            return;
        if (subsRemaining <= 0)
            return; // enforce UI-side limit
        try {
            // matches backend route
            await api.post(`/matchstate/${popupMatchId}/substitute`, {
                out,
                in: inId,
                isHomeTeam: isHomeTeamForPopup,
            });
            const side = isHomeTeamForPopup ? "home" : "away";
            const { data } = await api.get(`/matchstate/${popupMatchId}`, { params: { side } });
            setLineup(data.lineup);
            setBench(data.bench);
            setSubsRemaining(data.subsRemaining);
        }
        catch (e) {
            console.error("[MatchDayLive] Substitution failed:", e);
        }
    }, [popupMatchId, isHomeTeamForPopup, subsRemaining]);
    /* ---------------------------------------------------------------- */
    /* WebSocket live updates (server-authoritative)                     */
    /* ---------------------------------------------------------------- */
    useSocketEvent("match-event", (ev) => {
        if (liveStage !== "MATCHDAY" && liveStage !== "HALFTIME")
            return;
        setEventsByMatch((prev) => ({
            ...prev,
            [ev.matchId]: dedupeEvents([...(prev[ev.matchId] ?? []), ev]),
        }));
    });
    useSocketEvent("match-tick", (live) => {
        if (liveStage !== "MATCHDAY" && liveStage !== "HALFTIME")
            return;
        setServerMinute((prev) => (live.minute > prev ? live.minute : prev));
        setMatches((prev) => prev.map((m) => m.id === live.matchId
            ? {
                ...m,
                minute: live.minute,
                homeGoals: live.homeGoals,
                awayGoals: live.awayGoals,
            }
            : m));
    });
    /* ---------------------------------------------------------------- */
    /* 90' freeze → Results: when stage becomes RESULTS, short grace, go */
    /* ---------------------------------------------------------------- */
    useEffect(() => {
        if (liveStage !== "RESULTS")
            return;
        const to = matchdayType === "LEAGUE" ? standingsUrl : cupUrl;
        const t = setTimeout(() => navigate(to, { state: { cameFromResults: true } }), 3000);
        return () => clearTimeout(t);
    }, [liveStage, matchdayType, navigate]);
    /* ---------------------------------------------------------------- */
    /* Ticker payload                                                    */
    /* ---------------------------------------------------------------- */
    const tickerGames = useMemo(() => {
        return matches.map((m) => ({
            id: m.id,
            division: m.division,
            minute: m.minute ?? 0, // not shown by ticker when showMinute=false
            home: { id: m.homeTeam.id, name: m.homeTeam.name, score: m.homeGoals },
            away: { id: m.awayTeam.id, name: m.awayTeam.name, score: m.awayGoals },
            // latest event only → map to { text }
            events: (eventsByMatch[m.id] ?? [])
                .slice(-1)
                .map((ev) => ({
                minute: ev.minute,
                type: ev.type,
                text: ev.description,
            })),
        }));
    }, [matches, eventsByMatch]);
    const popupEvents = React.useMemo(() => {
        if (popupMatchId == null)
            return [];
        return (eventsByMatch[popupMatchId] ?? []).map((ev, i) => ({
            id: ev.id ?? i,
            minute: ev.minute,
            text: ev.description,
        }));
    }, [eventsByMatch, popupMatchId]);
    const canSubstitute = React.useMemo(() => {
        if (popupMatchId == null || coachTeamId == null)
            return false;
        const match = matches.find((m) => m.id === popupMatchId);
        if (!match)
            return false;
        const isCoachSide = match.homeTeam.id === coachTeamId || match.awayTeam.id === coachTeamId;
        return isCoachSide && subsRemaining > 0;
    }, [popupMatchId, coachTeamId, matches, subsRemaining]);
    /* ---------------------------------------------------------------- */
    /* Stage gate / Loading / Error                                     */
    /* ---------------------------------------------------------------- */
    if (bootstrapping) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-white", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    if (loading) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-white", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-red-300", children: error }));
    }
    /* ---------------------------------------------------------------- */
    /* Main render: SERVER CLOCK + single ticker                         */
    /* ---------------------------------------------------------------- */
    return (_jsxs("div", { className: "flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold", children: `Matchday ${currentMatchday} - ${matchdayType === "LEAGUE" ? "League" : "Cup"}` }), _jsxs("div", { className: "rounded-xl bg-white/10 px-4 py-2 text-lg font-semibold tabular-nums", children: [serverMinute, "'"] })] }), _jsx(AppCard, { variant: "outline", className: "bg-white/10 p-4", children: _jsx(MatchTicker, { games: tickerGames, onGameClick: (id) => {
                        const numId = Number(id);
                        const m = matches.find((x) => x.id === numId);
                        if (m && coachTeamId) {
                            if (m.homeTeam.id === coachTeamId)
                                setIsHomeTeamForPopup(true);
                            else if (m.awayTeam.id === coachTeamId)
                                setIsHomeTeamForPopup(false);
                            else
                                setIsHomeTeamForPopup(true);
                        }
                        else {
                            setIsHomeTeamForPopup(true);
                        }
                        setPopupMatchId(numId);
                        setPauseReason(null); // pure viewer open, not a forced pause
                        const side = m && coachTeamId && m.awayTeam.id === coachTeamId ? "away" : "home";
                        void api
                            .get(`/matchstate/${numId}`, { params: { side } })
                            .then(({ data }) => {
                            setLineup(data.lineup);
                            setBench(data.bench);
                            setSubsRemaining(data.subsRemaining);
                        })
                            .catch(() => {
                            /* ignore; user can retry during HT */
                        });
                    }, onTeamClick: async ({ matchId, isHome }) => {
                        setPopupMatchId(matchId);
                        setIsHomeTeamForPopup(isHome);
                        setPauseReason("COACH_PAUSE");
                        // ⛔ Pause clock when a team is clicked
                        await setStage("HALFTIME");
                        try {
                            const side = isHome ? "home" : "away";
                            const { data } = await api.get(`/matchstate/${matchId}`, { params: { side } });
                            setLineup(data.lineup);
                            setBench(data.bench);
                            setSubsRemaining(data.subsRemaining);
                        }
                        catch {
                            /* ignore; popup still opens */
                        }
                    }, showMinute: false, groupByDivision: true }) }), popupMatchId !== null && (_jsx(HalfTimePopup, { open: true, onClose: async () => {
                    try {
                        await setStage("MATCHDAY");
                    }
                    catch (e) {
                        console.warn("[MatchDayLive] Failed to resume MATCHDAY:", e);
                    }
                    finally {
                        setPopupMatchId(null);
                        setPauseReason(null);
                    }
                }, events: popupEvents, lineup: lineup, bench: bench, subsRemaining: subsRemaining, onSubstitute: handleSub, canSubstitute: canSubstitute, 
                // New: pass optional reason so UI can enforce GK rules/show messaging
                pauseReason: pauseReason ?? undefined }))] }));
}
/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
function dedupeEvents(list) {
    const seen = new Set();
    const out = [];
    for (const ev of list) {
        const key = ev.id != null ? `id:${ev.id}` : `m:${ev.matchId}|t:${ev.minute}|d:${ev.description}`;
        if (!seen.has(key)) {
            seen.add(key);
            out.push(ev);
        }
    }
    return out;
}
//# sourceMappingURL=MatchDayLivePage.js.map