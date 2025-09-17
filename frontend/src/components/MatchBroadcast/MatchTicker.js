import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
const divisionOrder = ["D1", "D2", "D3", "D4", "DIST"];
export default function MatchTicker({ games, onGameClick, onTeamClick, showMinute = false, groupByDivision = false, }) {
    const grouped = React.useMemo(() => {
        if (!groupByDivision) {
            return { order: ["ALL"], groups: { ALL: games } };
        }
        const groups = {};
        for (const d of divisionOrder)
            groups[d] = [];
        for (const g of games)
            (groups[g.division] ?? (groups[g.division] = [])).push(g);
        const order = divisionOrder.filter((d) => (groups[d] ?? []).length > 0);
        return { order, groups };
    }, [games, groupByDivision]);
    return (_jsx("div", { className: "flex flex-col gap-4", children: grouped.order.map((key) => (_jsxs("div", { className: "rounded-xl border border-white/10", children: [groupByDivision && (_jsx("div", { className: "px-3 py-2 text-sm font-semibold uppercase tracking-wide text-white/80", children: label(key) })), _jsx("ul", { className: "divide-y divide-white/10", children: (grouped.groups[key] ?? []).map((g) => {
                        const latest = (g.events ?? []).slice(-1)[0];
                        // Prefer live goals if present; fall back to legacy .score
                        const homeScore = typeof g.homeGoals === "number" ? g.homeGoals : Number(g.home?.score ?? 0);
                        const awayScore = typeof g.awayGoals === "number" ? g.awayGoals : Number(g.away?.score ?? 0);
                        return (_jsxs("li", { className: "flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer", onClick: () => onGameClick?.(g.id), children: [_jsxs("div", { className: "flex items-center gap-2", children: [showMinute && (_jsxs("span", { className: "w-10 text-right tabular-nums", children: [Number(g.minute ?? 0), "'"] })), _jsx("span", { className: "font-semibold hover:underline", onClick: (e) => {
                                                e.stopPropagation();
                                                onTeamClick?.({ matchId: g.id, teamId: g.home.id, isHome: true });
                                            }, children: g.home.name }), _jsxs("span", { className: "tabular-nums font-semibold", children: [" ", homeScore, " ", "x", " ", awayScore, " "] }), _jsx("span", { className: "font-semibold hover:underline", onClick: (e) => {
                                                e.stopPropagation();
                                                onTeamClick?.({ matchId: g.id, teamId: g.away.id, isHome: false });
                                            }, children: g.away.name })] }), _jsx("div", { className: "flex items-center gap-2 text-xs opacity-90", children: latest && (_jsxs("span", { className: "rounded bg-white/10 px-2 py-0.5 tabular-nums", children: [latest.minute, "' ", latest.text] })) })] }, g.id));
                    }) })] }, key))) }));
}
function label(code) {
    switch (code) {
        case "D1": return "Division 1";
        case "D2": return "Division 2";
        case "D3": return "Division 3";
        case "D4": return "Division 4";
        case "DIST": return "Distrital";
        default: return code;
    }
}
//# sourceMappingURL=MatchTicker.js.map