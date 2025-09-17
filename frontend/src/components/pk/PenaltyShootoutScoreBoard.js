import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/components/pk/PenaltyShootoutScoreboard.tsx
import * as React from "react";
/* ------------------------------------------------------------------------- */
/* Utils                                                                     */
/* ------------------------------------------------------------------------- */
function cx(...xs) {
    return xs.filter(Boolean).join(" ");
}
function AttemptIcon({ outcome }) {
    if (outcome === "GOAL")
        return _jsx("span", { className: "text-2xl font-extrabold", children: "\u2713" });
    if (outcome === "SAVE")
        return _jsx("span", { className: "text-2xl", title: "GK Save", children: "\uD83E\uDDE4" });
    return _jsx("span", { className: "text-2xl font-extrabold", children: "\u2716" });
}
function AttemptCell(props) {
    const { label, outcome, highlight, decisive, rightAlign } = props;
    return (_jsxs("div", { className: cx("flex items-center justify-between gap-3 rounded-xl border px-3 py-2", "border-emerald-900/40 bg-emerald-950/30", highlight && "ring-2 ring-yellow-400/70", decisive && "border-yellow-400/80", rightAlign && "flex-row-reverse"), children: [_jsx("div", { className: cx("truncate text-sm opacity-80", decisive && "font-bold text-emerald-100"), children: label ?? "—" }), _jsx("div", { className: cx("w-6", rightAlign ? "text-left" : "text-right"), children: outcome ? _jsx(AttemptIcon, { outcome: outcome }) : _jsx("span", { className: "opacity-30", children: "\u2022" }) })] }));
}
/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */
export default function PenaltyShootoutScoreboard(props) {
    const { homeLabel, awayLabel, homeShooters, awayShooters, attempts, current, decided, className, } = props;
    // Fast lookup: attempt by (side,index)
    const hMap = React.useMemo(() => {
        const m = new Map();
        for (const a of attempts)
            if (a.isHome)
                m.set(a.shotIndex, a);
        return m;
    }, [attempts]);
    const aMap = React.useMemo(() => {
        const m = new Map();
        for (const a of attempts)
            if (!a.isHome)
                m.set(a.shotIndex, a);
        return m;
    }, [attempts]);
    // Determine how many rows to render:
    // - at least 5 (best-of-5)
    // - plus any extra indexes we have attempts for
    // - also not less than the length of shooter lists (in case >5 were sent)
    const rowsCount = React.useMemo(() => {
        const hMax = hMap.size ? Math.max(...[...hMap.keys()]) + 1 : 0;
        const aMax = aMap.size ? Math.max(...[...aMap.keys()]) + 1 : 0;
        return Math.max(5, hMax, aMax, homeShooters.length, awayShooters.length);
    }, [hMap, aMap, homeShooters.length, awayShooters.length]);
    // Build rows with labels & outcomes
    const rows = React.useMemo(() => {
        const list = [];
        for (let i = 0; i < rowsCount; i++) {
            const hAtt = hMap.get(i);
            const aAtt = aMap.get(i);
            const hLabel = homeShooters[i]?.name ?? hAtt?.shooterName ?? "";
            const aLabel = awayShooters[i]?.name ?? aAtt?.shooterName ?? "";
            list.push({
                index: i,
                h: {
                    label: hLabel,
                    outcome: hAtt?.outcome,
                    decisive: !!hAtt?.decisive,
                    highlight: !decided && current?.isHome === true && current?.shotIndex === i && !hAtt,
                },
                a: {
                    label: aLabel,
                    outcome: aAtt?.outcome,
                    decisive: !!aAtt?.decisive,
                    highlight: !decided && current?.isHome === false && current?.shotIndex === i && !aAtt,
                },
            });
        }
        return list;
    }, [rowsCount, hMap, aMap, homeShooters, awayShooters, current, decided]);
    return (_jsxs("div", { className: cx("grid grid-cols-2 gap-4 md:gap-6", className), children: [_jsxs("div", { children: [_jsx("div", { className: "mb-1 text-xs uppercase tracking-widest text-emerald-200/70", children: homeLabel }), _jsx("div", { className: "flex flex-col gap-2", children: rows.map((r) => (_jsx(AttemptCell, { label: r.h.label, outcome: r.h.outcome, decisive: r.h.decisive, highlight: r.h.highlight }, `h-${r.index}`))) })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-1 text-right text-xs uppercase tracking-widest text-emerald-200/70", children: awayLabel }), _jsx("div", { className: "flex flex-col gap-2", children: rows.map((r) => (_jsx(AttemptCell, { label: r.a.label, outcome: r.a.outcome, decisive: r.a.decisive, highlight: r.a.highlight, rightAlign: true }, `a-${r.index}`))) })] })] }));
}
//# sourceMappingURL=PenaltyShootoutScoreBoard.js.map