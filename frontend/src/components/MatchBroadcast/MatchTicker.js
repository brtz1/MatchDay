import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, Fragment, useMemo, } from "react";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Clock from "@/components/MatchBroadcast/Clock";
/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export const MatchTicker = forwardRef(({ games, coachTeamId, onGameClick, className, ...rest }, ref) => {
    /** Group games by division for header sections. */
    const grouped = useMemo(() => {
        return games.reduce((acc, game) => {
            const key = game.division;
            if (!acc[key])
                acc[key] = [];
            acc[key].push(game);
            return acc;
        }, {});
    }, [games]);
    return (_jsx("div", { ref: ref, className: clsx("space-y-6", className), ...rest, children: Object.entries(grouped)
            .sort(([a], [b]) => String(a).localeCompare(String(b), undefined, {
            numeric: true,
        }))
            .map(([division, list]) => (_jsxs(Fragment, { children: [_jsxs("h3", { className: "border-l-4 border-blue-600 pl-2 text-sm font-semibold uppercase text-gray-700 dark:text-gray-300", children: ["Division ", division] }), _jsx("div", { className: "space-y-1", children: list.map((g) => {
                        const isCoach = g.home.id === coachTeamId ||
                            g.away.id === coachTeamId;
                        return (_jsxs("button", { onClick: () => onGameClick?.(g.id), className: clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors", "hover:bg-gray-100 dark:hover:bg-gray-800", isCoach &&
                                "ring-1 ring-inset ring-blue-500/50"), children: [_jsxs("div", { className: "flex flex-1 items-center gap-2", children: [_jsx(TeamBox, { name: g.home.name, highlight: g.home.id === coachTeamId }), _jsx("span", { className: "text-sm font-semibold tabular-nums", children: g.home.score }), _jsx(ChevronRight, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-sm font-semibold tabular-nums", children: g.away.score }), _jsx(TeamBox, { name: g.away.name, highlight: g.away.id === coachTeamId })] }), _jsx(Clock, { minute: g.minute, showProgress: false, className: "w-16" })] }, g.id));
                    }) })] }, division))) }));
});
MatchTicker.displayName = "MatchTicker";
/**
 * ---------------------------------------------------------------------------
 * Helper – TeamBox
 * ---------------------------------------------------------------------------
 */
function TeamBox({ name, highlight, }) {
    return (_jsx("span", { className: clsx("truncate rounded-md px-2 py-0.5 text-xs font-medium", highlight
            ? "bg-blue-600 text-white dark:bg-blue-500"
            : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"), style: { maxWidth: "7rem" }, title: name, children: name }));
}
export default MatchTicker;
//# sourceMappingURL=MatchTicker.js.map