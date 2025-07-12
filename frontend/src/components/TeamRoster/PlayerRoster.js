import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import clsx from "clsx";
import { getFlagUrl } from "@/utils/getFlagUrl";
/**
 * Sorted position groups (5 rows each → 20 total).
 */
const POSITION_ORDER = ["GK", "DF", "MF", "AT"];
const SLOTS_PER_POSITION = 5;
/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export default function PlayerRoster({ players, selectedPlayer, onSelectPlayer, }) {
    /**
     * Map players into position buckets and pad with blanks.
     */
    const grouped = React.useMemo(() => {
        return POSITION_ORDER.map((pos) => {
            const list = players.filter((p) => p.position === pos);
            const blanks = Array.from({ length: SLOTS_PER_POSITION - list.length }, (_, i) => ({
                id: `blank-${pos}-${i}`,
                name: "",
                position: pos,
                rating: 0,
                salary: 0,
                nationality: "",
                underContract: false,
            }));
            return [...list, ...blanks];
        });
    }, [players]);
    return (_jsxs("div", { className: "flex h-full flex-col gap-3 overflow-hidden rounded-lg bg-white p-3 text-xs shadow dark:bg-gray-900", children: [_jsxs("div", { className: "flex border-b border-gray-200 pb-2 font-semibold dark:border-gray-800", children: [_jsx("span", { className: "w-[35%]", children: "Name" }), _jsx("span", { className: "w-[20%] text-right", children: "Salary" }), _jsx("span", { className: "w-[10%] text-right", children: "Rat" }), _jsx("span", { className: "w-[10%] text-right", children: "\uD83C\uDF10" }), _jsx("span", { className: "w-[10%] text-right", children: "C" })] }), _jsx("div", { className: "flex flex-1 flex-col gap-2 overflow-y-auto pr-1", children: grouped.map((bucket, idx) => {
                    const pos = POSITION_ORDER[idx];
                    return (_jsxs("div", { children: [_jsx("div", { className: "mb-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400", children: pos }), _jsx("div", { className: "overflow-hidden rounded border border-gray-200 dark:border-gray-700", children: bucket.map((p, rowIdx) => {
                                    const isSelected = selectedPlayer?.id === p.id;
                                    const isBlank = p.name === "";
                                    return (_jsxs("div", { role: "button", className: clsx("flex items-center px-2 py-[3px] transition-colors", rowIdx % 2 === 0
                                            ? "bg-gray-50 dark:bg-gray-800/20"
                                            : "bg-white dark:bg-gray-800", isSelected && "bg-yellow-200 dark:bg-yellow-600/40", !isBlank && "hover:bg-gray-100 dark:hover:bg-gray-700"), style: { minHeight: "24px" }, onClick: () => !isBlank && onSelectPlayer(p), children: [_jsx("span", { className: "w-[35%] truncate", children: p.name }), _jsx("span", { className: "w-[20%] text-right", children: isBlank ? "" : `€${p.salary.toLocaleString()}` }), _jsx("span", { className: "w-[10%] text-right", children: isBlank ? "" : p.rating }), _jsx("span", { className: "w-[10%] text-right", children: p.nationality && (_jsx("img", { src: getFlagUrl(p.nationality), alt: p.nationality, className: "inline h-4 w-5" })) }), _jsx("span", { className: "w-[10%] text-right", children: isBlank ? "" : p.underContract ? "🔒" : "🆓" })] }, p.id));
                                }) })] }, pos));
                }) })] }));
}
//# sourceMappingURL=PlayerRoster.js.map