import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/components/pk/PenaltyShootoutTeamBox.tsx
import * as React from "react";
/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */
function cx(...xs) {
    return xs.filter(Boolean).join(" ");
}
/** Auto-pick shooters from players: priority AT → MF → DF, then rating DESC, tiebreak by name */
function autoPickShooters(players, max = 10) {
    const priority = { AT: 0, MF: 1, DF: 2, GK: 3 };
    // filter out GK by default for shootouts (project rule)
    const pool = players.filter((p) => p.position !== "GK" && (p.onPitch ?? true));
    // sort by role priority, then rating desc, then name asc
    pool.sort((a, b) => {
        const prio = priority[a.position] - priority[b.position];
        if (prio !== 0)
            return prio;
        if (b.rating !== a.rating)
            return b.rating - a.rating;
        return a.name.localeCompare(b.name);
    });
    return pool.slice(0, Math.max(5, Math.min(max, pool.length))).map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        rating: p.rating,
    }));
}
function AttemptIcon({ outcome }) {
    if (outcome === "GOAL")
        return _jsx("span", { className: "text-base font-extrabold", children: "\u2713" });
    if (outcome === "SAVE")
        return _jsx("span", { title: "GK Save", children: "\uD83E\uDDE4" });
    return _jsx("span", { className: "text-base font-extrabold", children: "\u2716" });
}
/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */
export default function PenaltyShootoutTeamBox(props) {
    const { teamName, shooters, players, baseCount = 5, align = "left", current, outcomesByIndex, } = props;
    // Decide list to render
    const list = React.useMemo(() => {
        if (shooters && shooters.length)
            return shooters;
        if (players && players.length)
            return autoPickShooters(players, 15);
        return [];
    }, [shooters, players]);
    return (_jsxs("div", { className: cx("flex flex-col", align === "right" ? "items-end text-right" : "items-start text-left"), children: [_jsx("div", { className: cx("mb-2 inline-block rounded-md bg-red-600 px-3 py-1 text-xs font-black tracking-wide text-white", align === "right" ? "self-end" : "self-start"), children: teamName.toUpperCase() }), _jsx("div", { className: "w-full max-w-xs rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-2", children: list.length === 0 ? (_jsx("div", { className: "px-2 py-3 text-sm opacity-70", children: "No shooters available" })) : (_jsx("ul", { className: "flex flex-col gap-1", children: list.map((s, idx) => {
                        const isCurrent = current?.shotIndex === idx;
                        const outcome = outcomesByIndex?.[idx];
                        const inBase = idx < baseCount;
                        return (_jsxs("li", { className: cx("flex items-center justify-between gap-2 rounded-lg px-2 py-1", "hover:bg-emerald-900/30", inBase ? "bg-emerald-900/20" : "", isCurrent ? "ring-2 ring-yellow-400/70" : ""), children: [_jsxs("div", { className: cx("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse"), children: [s.position && (_jsx("span", { className: "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-emerald-800 px-1 text-[10px] font-bold text-emerald-100", children: s.position })), _jsx("span", { className: "truncate text-sm text-emerald-100", children: s.name }), isCurrent && (_jsx("span", { className: cx("text-xs font-bold text-yellow-300", align === "right" ? "mr-1" : "ml-1"), title: "Current taker", children: "\u2605" }))] }), _jsxs("div", { className: cx("flex shrink-0 items-center gap-2", align === "right" && "flex-row-reverse"), children: [typeof s.rating === "number" && (_jsx("span", { className: "rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-bold text-emerald-100", children: s.rating })), outcome ? (_jsx("span", { className: "w-5 text-right", children: _jsx(AttemptIcon, { outcome: outcome }) })) : (_jsx("span", { className: "w-5 opacity-25", children: "\u2022" }))] })] }, s.id ?? `${s.name}-${idx}`));
                    }) })) }), _jsxs("div", { className: "mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-emerald-200/70", children: [_jsxs("span", { className: "rounded bg-emerald-900/30 px-1.5 py-0.5", children: ["Top ", baseCount] }), _jsx("span", { children: "\u2605 Current" }), _jsx("span", { children: "\u2713 Goal" }), _jsx("span", { children: "\u2716 Miss" }), _jsx("span", { children: "\uD83E\uDDE4 Save" })] })] }));
}
//# sourceMappingURL=PenaltyShootoutTeamBox.js.map