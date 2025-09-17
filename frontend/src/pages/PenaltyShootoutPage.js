import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/axios";
import { useGameState } from "@/store/GameStateStore";
// Your socket module already exports helpers like onStageChanged/offStageChanged.
// We read the raw socket too, falling back gracefully if your helper wrappers aren't ready.
import * as Sock from "@/socket";
/* ----------------------------------------------------------------------------
   Small helpers
----------------------------------------------------------------------------- */
function useSocketEvent(event, handler) {
    useEffect(() => {
        // Try dedicated helpers if your socket module exposes them; otherwise use raw socket.
        const raw = Sock.socket ||
            Sock.getSocket?.() ||
            Sock.default ||
            window.socket;
        if (!raw?.on)
            return;
        raw.on(event, handler);
        return () => {
            raw.off?.(event, handler);
        };
    }, [event, handler]);
}
function classNames(...xs) {
    return xs.filter(Boolean).join(" ");
}
/* ----------------------------------------------------------------------------
   Suspense ticker (1.2s default) — shimmer bar used between attempts
----------------------------------------------------------------------------- */
function SuspenseTicker({ ms = 1200 }) {
    const [on, setOn] = useState(true);
    useEffect(() => {
        const t = setTimeout(() => setOn(false), ms);
        return () => clearTimeout(t);
    }, [ms]);
    if (!on)
        return null;
    return (_jsxs("div", { className: "mt-4 w-full", children: [_jsx("div", { className: "h-2 w-full overflow-hidden rounded bg-emerald-900/40", children: _jsx("div", { className: "h-2 animate-[shimmer_1.2s_linear_infinite] bg-emerald-400/70" }) }), _jsx("style", { children: `@keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }` })] }));
}
/* ----------------------------------------------------------------------------
   AttemptIcon — ✓ goal / ✖ miss / 🧤 save
----------------------------------------------------------------------------- */
function AttemptIcon({ outcome }) {
    if (outcome === "GOAL")
        return _jsx("span", { className: "text-2xl font-extrabold", children: "\u2713" });
    if (outcome === "SAVE")
        return _jsx("span", { className: "text-2xl", title: "GK Save", children: "\uD83E\uDDE4" });
    return _jsx("span", { className: "text-2xl font-extrabold", children: "\u2716" });
}
/* ----------------------------------------------------------------------------
   Row cell for one team’s attempt
----------------------------------------------------------------------------- */
function AttemptCell(props) {
    const { label, outcome, highlight } = props;
    return (_jsxs("div", { className: classNames("flex items-center justify-between gap-3 rounded-xl border px-3 py-2", "border-emerald-900/40 bg-emerald-950/30", highlight && "ring-2 ring-yellow-400/70"), children: [_jsx("div", { className: "truncate text-sm opacity-80", children: label ?? "—" }), _jsx("div", { className: "w-6 text-right", children: outcome ? (_jsx(AttemptIcon, { outcome: outcome })) : (_jsx("span", { className: "opacity-30", children: "\u2022" })) })] }));
}
/* ----------------------------------------------------------------------------
   Team header badge
----------------------------------------------------------------------------- */
function TeamBadge({ name, right }) {
    return (_jsx("div", { className: classNames("mb-2 inline-block rounded-md bg-red-600 px-3 py-1 text-xs font-black tracking-wide text-white", right ? "self-end" : "self-start"), children: name.toUpperCase() }));
}
/* ----------------------------------------------------------------------------
   Main page
----------------------------------------------------------------------------- */
export default function PenaltyShootoutPage() {
    const navigate = useNavigate();
    const { currentSaveGameId } = useGameState();
    const [matchId, setMatchId] = useState(null);
    const [home, setHome] = useState(null);
    const [away, setAway] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [ended, setEnded] = useState(null);
    // Keep a ref for gentle autoscroll to latest row
    const rowsEndRef = useRef(null);
    useEffect(() => {
        rowsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [attempts.length]);
    // Subscribe to socket events (pk-start / pk-attempt / pk-end)
    useSocketEvent("pk-start", (payload) => {
        setMatchId(payload.matchId);
        setHome(payload.home);
        setAway(payload.away);
        setAttempts([]);
        setEnded(null);
    });
    useSocketEvent("pk-attempt", (payload) => {
        // only accept if we’re on the same match
        if (matchId && payload.matchId !== matchId)
            return;
        setAttempts((prev) => [...prev, payload]);
    });
    useSocketEvent("pk-end", (payload) => {
        if (matchId && payload.matchId !== matchId)
            return;
        setEnded(payload);
    });
    // If user refreshes the page, you might want to load current PK state:
    // We’ll try a gentle fetch; if your route doesn’t exist yet, it will just no-op.
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await api.get("/pk/state").catch(() => ({ data: null }));
                if (!mounted || !data)
                    return;
                const s = data;
                setMatchId(s.matchId);
                setHome(s.home);
                setAway(s.away);
                setAttempts(s.attempts ?? []);
                setEnded(s.end ?? null);
            }
            catch {
                /* ignore */
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);
    const maxRows = useMemo(() => {
        // Base 5 + any sudden-death attempts that have already happened.
        const homeCount = attempts.filter((a) => a.isHome).length;
        const awayCount = attempts.filter((a) => !a.isHome).length;
        return Math.max(5, Math.max(homeCount, awayCount));
    }, [attempts]);
    const gridRows = useMemo(() => {
        const rows = [];
        const hOrder = home?.shooters ?? [];
        const aOrder = away?.shooters ?? [];
        // Build row by row; index is 0-based
        for (let i = 0; i < maxRows || i < attempts.length / 2; i++) {
            const r = { index: i };
            // Try to attach outcomes for this row if they exist
            const hAtt = attempts.find((a) => a.isHome && a.shotIndex === i);
            const aAtt = attempts.find((a) => !a.isHome && a.shotIndex === i);
            r.home = {
                label: hOrder[i]?.name ?? "",
                outcome: hAtt?.outcome,
            };
            r.away = {
                label: aOrder[i]?.name ?? "",
                outcome: aAtt?.outcome,
            };
            rows.push(r);
        }
        return rows;
    }, [attempts, home, away, maxRows]);
    const tally = useMemo(() => {
        let h = 0;
        let a = 0;
        for (const x of attempts) {
            if (x.outcome === "GOAL") {
                if (x.isHome)
                    h++;
                else
                    a++;
            }
        }
        // If pk-end payload already supplied official tally, prefer it
        if (ended?.tally)
            return ended.tally;
        return { home: h, away: a };
    }, [attempts, ended]);
    const decided = !!ended;
    // Continue → tell backend we’re done watching and move the game forward.
    const handleContinue = async () => {
        try {
            await api.post("/pk/ack", {
                saveGameId: currentSaveGameId,
                matchId,
            });
        }
        catch {
            // graceful fallback: just navigate to standings/results flow;
            // your stage-changed socket should also move the UI soon after.
        }
        // Navigate back to the standard post-match flow – Results screen will push to Standings automatically.
        navigate("/standings", { replace: true });
    };
    return (_jsxs("div", { className: "relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8", children: [_jsx("div", { className: "pointer-events-none fixed inset-0 -z-10 bg-emerald-800" }), _jsx("div", { className: "pointer-events-none fixed inset-0 -z-10 opacity-20", style: { backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "12px 12px" } }), _jsxs("header", { className: "mb-6 mt-2 flex items-center justify-between", children: [_jsx("h1", { className: "select-none text-4xl font-black tracking-[0.2em] text-lime-300 md:text-5xl", children: "PENALTIES" }), _jsxs("div", { className: "rounded-lg bg-emerald-900/50 px-3 py-2 text-sm text-emerald-200", children: ["Match #", matchId ?? "—"] })] }), _jsxs("div", { className: "mb-4 flex items-center justify-center gap-6", children: [_jsx(TeamBadge, { name: home?.name ?? "HOME" }), _jsxs("span", { className: "text-5xl font-black text-lime-200", children: [tally.home, ":", tally.away] }), _jsx(TeamBadge, { name: away?.name ?? "AWAY", right: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 md:gap-6", children: [_jsxs("div", { children: [_jsx("div", { className: "mb-1 text-xs uppercase tracking-widest text-emerald-200/70", children: home?.name ?? "Home" }), _jsxs("div", { className: "flex flex-col gap-2", children: [gridRows.map((r) => (_jsx(AttemptCell, { label: r.home?.label, outcome: r.home?.outcome, 
                                        // highlight the next shooter if row is not filled yet
                                        highlight: !r.home?.outcome && !decided }, `h-${r.index}`))), _jsx("div", { ref: rowsEndRef })] })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-1 text-right text-xs uppercase tracking-widest text-emerald-200/70", children: away?.name ?? "Away" }), _jsx("div", { className: "flex flex-col gap-2", children: gridRows.map((r) => (_jsx(AttemptCell, { label: r.away?.label, outcome: r.away?.outcome, highlight: !r.away?.outcome && !decided }, `a-${r.index}`))) })] })] }), !decided && _jsx(SuspenseTicker, {}), _jsxs("footer", { className: "mt-auto flex items-center justify-between gap-3 pt-6", children: [_jsx("div", { className: "text-xs text-emerald-100/70", children: "Best of 5. Sudden death if tied." }), _jsx("div", { className: "flex items-center gap-2", children: decided ? (_jsx("button", { className: "rounded-xl bg-yellow-400 px-5 py-2 text-sm font-bold text-emerald-950 shadow-md transition hover:brightness-95 active:translate-y-[1px]", onClick: handleContinue, children: "Continue" })) : (_jsx("div", { className: "rounded-xl bg-emerald-900/60 px-4 py-2 text-xs text-emerald-200", children: "Waiting for next kick\u2026" })) })] })] }));
}
//# sourceMappingURL=PenaltyShootoutPage.js.map