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
    const [lineup, setLineup] = useState([]);
    const [bench, setBench] = useState([]);
    const [subsRemaining, setSubsRemaining] = useState(3);
    /* Fetch fixtures + events + matchday context ----------------------- */
    useEffect(() => {
        (async () => {
            try {
                const { data: { currentMatchday, matchdayType }, } = await api.get("/gamestate");
                setCurrentMatchday(currentMatchday);
                setMatchdayType(matchdayType);
                const [matchesRes, eventsRes] = await Promise.all([
                    api.get(`/matches/${currentMatchday}`),
                    api.get(`/match-events/${currentMatchday}`),
                ]);
                setMatches(matchesRes.data);
                const grouped = {};
                for (const ev of eventsRes.data) {
                    (grouped[ev.matchId] ??= []).push(ev);
                }
                setEventsByMatch(grouped);
            }
            catch {
                setError("Failed to load live matchday data.");
            }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    /* Fetch match state (lineup + bench) for popup ---------------------- */
    useEffect(() => {
        if (popupMatchId !== null) {
            (async () => {
                try {
                    const { data } = await api.get(`/match-state/${popupMatchId}`);
                    setLineup(data.lineup ?? []);
                    setBench(data.bench ?? []);
                    setSubsRemaining(data.subsRemaining ?? 3);
                }
                catch (e) {
                    console.error("Failed to load match state:", e);
                }
            })();
        }
    }, [popupMatchId]);
    /* Live updates via WebSocket -------------------------------------- */
    useSocketEvent("match-event", (ev) => {
        setEventsByMatch((prev) => ({
            ...prev,
            [ev.matchId]: [...(prev[ev.matchId] ?? []), ev],
        }));
    });
    useSocketEvent("match-tick", (live) => {
        setMatches((prev) => prev.map((m) => (m.id === live.id ? { ...m, ...live } : m)));
    });
    /* Ticker display -------------------------------------------------- */
    const tickerGames = matches.map((m) => {
        const latest = eventsByMatch[m.id]?.at(-1);
        return {
            id: m.id,
            division: m.division,
            minute: m.minute ?? 0,
            home: {
                id: m.homeTeam.id,
                name: m.homeTeam.name,
                score: m.homeScore ?? 0,
            },
            away: {
                id: m.awayTeam.id,
                name: m.awayTeam.name,
                score: m.awayScore ?? 0,
            },
            latestEvent: latest?.description ?? "",
        };
    });
    /* Match event feed ------------------------------------------------ */
    const popupEvents = useMemo(() => {
        if (popupMatchId == null)
            return [];
        return (eventsByMatch[popupMatchId] ?? []).map((ev, i) => ({
            id: i,
            minute: ev.minute,
            text: ev.description,
        }));
    }, [eventsByMatch, popupMatchId]);
    /* Loading / error display ----------------------------------------- */
    if (loading) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-white", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-red-300", children: error }));
    }
    /* Render ----------------------------------------------------------- */
    return (_jsxs("div", { className: "flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white", children: [_jsx("h1", { className: "text-2xl font-bold", children: `Matchday ${currentMatchday} - ${matchdayType === "LEAGUE" ? "League" : "Cup"}` }), _jsx(AppCard, { variant: "outline", className: "bg-white/10 p-4", children: _jsx(MatchTicker, { games: tickerGames, onGameClick: (id) => setPopupMatchId(Number(id)) }) }), popupMatchId !== null && (_jsx(HalfTimePopup, { open: true, onClose: () => setPopupMatchId(null), events: popupEvents, lineup: lineup, bench: bench, subsRemaining: subsRemaining, onSubstitute: (payload) => {
                    console.log("Substitution sent:", payload);
                    // TODO: wire mutation to backend
                } }))] }));
}
//# sourceMappingURL=MatchDayLivePage.js.map