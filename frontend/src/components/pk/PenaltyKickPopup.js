import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// frontend/src/components/pk/PenaltyKickPopup.tsx
//
// In-match penalty popup for the coached team.
// - Lists current *lineup* players for selection (default excludes GK).
// - After pick, shows a short suspense countdown.
// - Then reveals the outcome: "GOAL!", "MISSED!", or "GK DEFENDS!".
// - Calls POST /pk/take with { saveGameId, matchId, shooterId }.
// - Emits result via onResolved and then lets the parent close.
//
// Tailwind-only, no external UI deps.
import * as React from "react";
import api from "@/services/axios";
/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */
function cx(...xs) {
    return xs.filter(Boolean).join(" ");
}
const POS_PRIORITY = { AT: 0, MF: 1, DF: 2, GK: 3 };
/** Sort AT→MF→DF→GK and then rating DESC, tiebreak by name */
function sortForPenalty(list, allowGK = false) {
    const filtered = allowGK ? list.slice() : list.filter((p) => p.position !== "GK");
    filtered.sort((a, b) => {
        const pr = POS_PRIORITY[a.position] - POS_PRIORITY[b.position];
        if (pr !== 0)
            return pr;
        if (b.rating !== a.rating)
            return b.rating - a.rating;
        return a.name.localeCompare(b.name);
    });
    return filtered;
}
function OutcomeBig({ outcome }) {
    const text = outcome === "GOAL" ? "GOAL!" : outcome === "SAVE" ? "GK DEFENDS!" : "MISSED!";
    const color = outcome === "GOAL"
        ? "text-lime-300"
        : outcome === "SAVE"
            ? "text-cyan-300"
            : "text-red-300";
    return (_jsx("div", { className: cx("select-none text-5xl font-black tracking-wide", color), children: text }));
}
/* Tiny shimmer progress bar for suspense */
function SuspenseBar({ ms }) {
    return (_jsxs("div", { className: "mt-5 w-full", children: [_jsx("div", { className: "h-2 w-full overflow-hidden rounded bg-emerald-900/40", children: _jsx("div", { className: "h-2 animate-[shimmer_1.2s_linear_infinite] bg-emerald-400/70", style: { animationDuration: `${Math.max(900, ms)}ms` } }) }), _jsx("style", { children: `@keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }` })] }));
}
/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */
export default function PenaltyKickPopup(props) {
    const { open, saveGameId, matchId, lineup, teamName, allowGK = false, suspenseMs = 1200, onClose, onResolved, } = props;
    const [stage, setStage] = React.useState("choose");
    const [sorted, setSorted] = React.useState([]);
    const [selectedId, setSelectedId] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [outcome, setOutcome] = React.useState(null);
    const [newScore, setNewScore] = React.useState();
    // Prepare visible list when opened
    React.useEffect(() => {
        if (open) {
            setSorted(sortForPenalty(lineup, allowGK));
            setStage("choose");
            setSelectedId(null);
            setOutcome(null);
            setNewScore(undefined);
            setError(null);
        }
    }, [open, lineup, allowGK]);
    const shooter = React.useMemo(() => sorted.find((p) => p.id === selectedId), [sorted, selectedId]);
    async function handlePick(playerId) {
        if (loading)
            return;
        setSelectedId(playerId);
        setStage("countdown");
        setError(null);
        setLoading(true);
        // Keep a minimum suspense duration even if backend is instant
        const suspense = new Promise((r) => setTimeout(r, suspenseMs));
        let respOutcome = "MISS";
        let respScore;
        try {
            const { data } = await api.post("/pk/take", {
                saveGameId,
                matchId,
                shooterId: playerId,
            });
            // Expected { outcome: 'GOAL'|'MISS'|'SAVE', newScore?: {home,away} }
            respOutcome = (data?.outcome ?? "MISS");
            if (data?.newScore && typeof data.newScore.home === "number") {
                respScore = data.newScore;
            }
        }
        catch (e) {
            // If backend fails, default to MISS so game can continue (fail-safe).
            setError("Network error. Treating as miss.");
            respOutcome = "MISS";
        }
        await suspense;
        setOutcome(respOutcome);
        setNewScore(respScore);
        setStage("reveal");
        setLoading(false);
        onResolved?.({
            shooterId: playerId,
            outcome: respOutcome,
            newScore: respScore,
        });
    }
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-[1000] flex items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-[1px]" }), _jsxs("div", { className: cx("relative z-10 w-[min(720px,92vw)] rounded-2xl border-2 border-emerald-900/40", "bg-red-900/90 shadow-2xl ring-1 ring-black/30"), children: [_jsxs("div", { className: "flex items-center justify-between gap-3 rounded-t-2xl bg-red-950/70 px-5 py-3", children: [_jsx("div", { className: "select-none text-3xl font-black tracking-[0.3em] text-lime-200", children: "PENALTI" }), _jsx("div", { className: "rounded bg-red-800/60 px-2 py-1 text-xs font-bold text-red-100", children: teamName ?? "Your Team" })] }), _jsxs("div", { className: "px-5 pb-5 pt-4", children: [stage === "choose" && (_jsxs(_Fragment, { children: [_jsx("p", { className: "mb-3 text-sm text-red-50/90", children: "Choose the player to take the penalty:" }), _jsx("div", { className: "max-h-[50vh] overflow-auto rounded-xl border border-red-800/60 bg-red-950/40", children: _jsx("ul", { className: "divide-y divide-red-800/40", children: sorted.map((p) => (_jsxs("li", { className: cx("flex cursor-pointer items-center justify-between px-3 py-2.5 transition", "hover:bg-red-900/40", selectedId === p.id && "bg-red-900/50 ring-1 ring-yellow-300/60"), onClick: () => handlePick(p.id), children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx("span", { className: "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-red-800 px-1 text-[10px] font-bold text-red-100", children: p.position }), _jsx("span", { className: "truncate text-sm text-red-50", children: p.name })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "rounded bg-red-800 px-1.5 py-0.5 text-[10px] font-bold text-red-100", children: p.rating }), _jsx("button", { className: "rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-red-950 shadow-sm transition hover:brightness-95 active:translate-y-[1px]", onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    handlePick(p.id);
                                                                }, children: "Choose" })] })] }, p.id))) }) }), error && (_jsx("div", { className: "mt-3 text-xs font-semibold text-yellow-200", children: error }))] })), stage === "countdown" && (_jsxs("div", { className: "flex flex-col items-center justify-center py-6 text-center", children: [_jsx("div", { className: "mb-1 text-xs uppercase tracking-widest text-red-50/80", children: "Shooter" }), _jsx("div", { className: "mb-3 text-lg font-bold text-yellow-200", children: shooter?.name ?? "—" }), _jsx("div", { className: "text-sm text-red-50/80", children: "Preparing to take the kick\u2026" }), _jsx(SuspenseBar, { ms: suspenseMs })] })), stage === "reveal" && outcome && (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-center", children: [_jsx(OutcomeBig, { outcome: outcome }), newScore && (_jsxs("div", { className: "mt-3 rounded bg-red-800/60 px-3 py-1 text-xs font-bold text-red-100", children: ["Score now: ", newScore.home, ":", newScore.away] }))] }))] }), _jsx("div", { className: "flex items-center justify-end gap-2 rounded-b-2xl bg-red-950/70 px-5 py-3", children: stage === "choose" ? (_jsx("button", { className: "rounded-lg px-3 py-1.5 text-xs font-semibold text-red-100/80 hover:text-red-50", onClick: onClose, disabled: loading, children: "Cancel" })) : stage === "countdown" ? (_jsx("button", { className: "cursor-not-allowed rounded-lg bg-red-800/60 px-3 py-1.5 text-xs font-bold text-red-200/60", disabled: true, children: "Resolving\u2026" })) : (_jsx("button", { className: "rounded-lg bg-yellow-400 px-4 py-1.5 text-xs font-bold text-red-950 shadow-sm transition hover:brightness-95 active:translate-y-[1px]", onClick: onClose, children: "Continue" })) })] })] }));
}
//# sourceMappingURL=PenaltyKickPopup.js.map