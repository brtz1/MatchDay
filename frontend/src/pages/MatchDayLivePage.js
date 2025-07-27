import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/axios";
import { useSocketEvent } from "@/hooks/useSocket";
import { AppCard } from "@/components/common/AppCard";
import MatchTicker from "@/components/MatchBroadcast/MatchTicker";
import HalfTimePopup from "@/pages/HalfTimePopup";
import { ProgressBar } from "@/components/common/ProgressBar";
/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function MatchDayLivePage() {
    const [matches, setMatches] = useState([]);
    const [eventsByMatch, setEventsByMatch] = useState({});
    const [popupMatchId, setPopupMatchId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentMatchday, setCurrentMatchday] = useState(null);
    const [matchdayType, setMatchdayType] = useState("LEAGUE");
    const [coachTeamId, setCoachTeamId] = useState(null);
    const [lineup, setLineup] = useState([]);
    const [bench, setBench] = useState([]);
    const [subsRemaining, setSubsRemaining] = useState(3);
    /* ---------------------------------------------------------------- */
    /* Fetch fixtures, events & game state                              */
    /* ---------------------------------------------------------------- */
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data: gs } = await api.get("/gamestate");
                setCurrentMatchday(gs.currentMatchday);
                setMatchdayType(gs.matchdayType);
                setCoachTeamId(gs.coachTeamId);
                const { data: fetchedMatches } = await api.get("/matches", {
                    params: { matchday: gs.currentMatchday },
                });
                setMatches(fetchedMatches);
                const { data: groupedEvents } = await api.get(`/match-events/by-matchday/${gs.currentMatchday}`);
                setEventsByMatch(groupedEvents);
            }
            catch (e) {
                console.error("Failed to load matchday data:", e);
                setError("Failed to load live matchday data.");
            }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    /* ---------------------------------------------------------------- */
    /* Fetch match state (lineup + bench) for half-time popup           */
    /* ---------------------------------------------------------------- */
    useEffect(() => {
        if (popupMatchId !== null) {
            (async () => {
                try {
                    const { data } = await api.get(`/matchstate/${popupMatchId}`);
                    setLineup(data.lineup);
                    setBench(data.bench);
                    setSubsRemaining(data.subsRemaining);
                }
                catch (e) {
                    console.error("Failed to load match state:", e);
                }
            })();
        }
    }, [popupMatchId]);
    /* ---------------------------------------------------------------- */
    /* Substitution handler                                             */
    /* ---------------------------------------------------------------- */
    async function handleSub({ out, in: inId }) {
        if (popupMatchId == null)
            return;
        try {
            await api.post(`/matchstate/${popupMatchId}/substitute`, {
                out,
                in: inId,
                isHomeTeam: true,
            });
            const { data } = await api.get(`/matchstate/${popupMatchId}`);
            setLineup(data.lineup);
            setBench(data.bench);
            setSubsRemaining(data.subsRemaining);
        }
        catch (e) {
            console.error("Substitution failed:", e);
        }
    }
    /* ---------------------------------------------------------------- */
    /* Real-time updates via WebSocket                                  */
    /* ---------------------------------------------------------------- */
    useSocketEvent("match-event", (ev) => {
        setEventsByMatch((prev) => ({
            ...prev,
            [ev.matchId]: [...(prev[ev.matchId] ?? []), ev],
        }));
    });
    useSocketEvent("match-tick", (live) => {
        setMatches((prev) => prev.map((m) => (m.id === live.id ? { ...m, ...live } : m)));
    });
    /* ---------------------------------------------------------------- */
    /* Prepare data for ticker & popup                                  */
    /* ---------------------------------------------------------------- */
    const tickerGames = matches.map((m) => ({
        id: m.id,
        division: m.division,
        minute: m.minute ?? 0,
        home: { id: m.homeTeam.id, name: m.homeTeam.name, score: m.homeGoals },
        away: { id: m.awayTeam.id, name: m.awayTeam.name, score: m.awayGoals },
        latestEvent: eventsByMatch[m.id]?.slice(-1)[0]?.description ?? "",
    }));
    const popupEvents = useMemo(() => {
        if (popupMatchId == null)
            return [];
        return (eventsByMatch[popupMatchId] ?? []).map((ev, i) => ({
            id: i,
            minute: ev.minute,
            text: ev.description,
        }));
    }, [eventsByMatch, popupMatchId]);
    const canSubstitute = useMemo(() => {
        if (popupMatchId == null || coachTeamId == null)
            return false;
        const match = matches.find((m) => m.id === popupMatchId);
        if (!match)
            return false;
        return match.homeTeam.id === coachTeamId;
    }, [popupMatchId, coachTeamId, matches]);
    /* ---------------------------------------------------------------- */
    /* Loading/Error state                                              */
    /* ---------------------------------------------------------------- */
    if (loading) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-white", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-red-300", children: error }));
    }
    /* ---------------------------------------------------------------- */
    /* Main render                                                      */
    /* ---------------------------------------------------------------- */
    return (_jsxs("div", { className: "flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white", children: [_jsx("h1", { className: "text-2xl font-bold", children: `Matchday ${currentMatchday} - ${matchdayType === "LEAGUE" ? "League" : "Cup"}` }), _jsx(AppCard, { variant: "outline", className: "bg-white/10 p-4", children: _jsx(MatchTicker, { games: tickerGames, onGameClick: (id) => setPopupMatchId(Number(id)) }) }), popupMatchId !== null && (_jsx(HalfTimePopup, { open: true, onClose: () => setPopupMatchId(null), events: popupEvents, lineup: lineup, bench: bench, subsRemaining: subsRemaining, onSubstitute: handleSub, canSubstitute: canSubstitute }))] }));
}
//# sourceMappingURL=MatchDayLivePage.js.map