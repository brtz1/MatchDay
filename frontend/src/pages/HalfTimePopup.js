import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import clsx from "clsx";
import Modal from "@/components/common/Modal";
import { AppButton } from "@/components/common/AppButton";
import MatchEventFeed from "@/components/MatchBroadcast/MatchEventFeed";
/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function HalfTimePopup({ open, onClose, events, lineup, bench, subsRemaining, onSubstitute, canSubstitute, }) {
    const [selectedOut, setSelectedOut] = useState(null);
    const [selectedIn, setSelectedIn] = useState(null);
    function commitSub(e) {
        e.preventDefault();
        if (selectedOut == null || selectedIn == null)
            return;
        onSubstitute({ out: selectedOut, in: selectedIn });
        setSelectedOut(null);
        setSelectedIn(null);
    }
    const disableCommit = selectedOut == null ||
        selectedIn == null ||
        selectedOut === selectedIn ||
        subsRemaining === 0;
    return (_jsxs(Modal, { open: open, onClose: onClose, title: "Half-Time", size: "lg", isLocked: false, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200", children: "Match Events" }), _jsx(MatchEventFeed, { events: events, maxHeightRem: 18 })] }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("h3", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: ["Substitutions (remaining ", subsRemaining, ")"] }), _jsx(RosterList, { title: "On Field", players: lineup, selected: selectedOut, onSelect: canSubstitute ? setSelectedOut : () => { } }), _jsx(RosterList, { title: "Bench", players: bench, selected: selectedIn, onSelect: canSubstitute ? setSelectedIn : () => { } }), canSubstitute && (_jsx(AppButton, { onClick: commitSub, disabled: disableCommit, className: "self-end", children: "Confirm Sub" }))] })] }), _jsx("div", { className: "mt-4 flex justify-end gap-2", children: _jsx(AppButton, { variant: "ghost", onClick: onClose, children: "Close" }) })] }));
}
/* -------------------------------------------------------------------------- */
/* Helper – RosterList                                                        */
/* -------------------------------------------------------------------------- */
function RosterList({ title, players, selected, onSelect, }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400", children: title }), _jsx("div", { className: "max-h-40 overflow-y-auto rounded border border-gray-200 dark:border-gray-700", children: players.map((p, idx) => (_jsxs("div", { onClick: () => !p.isInjured && onSelect(p.id), className: clsx("flex cursor-pointer items-center gap-2 px-2 py-[3px] text-xs transition-colors", idx % 2 === 0
                        ? "bg-gray-50 dark:bg-gray-800/20"
                        : "bg-white dark:bg-gray-800", selected === p.id && "bg-yellow-200 dark:bg-yellow-600/40", p.isInjured && "line-through text-red-600 dark:text-red-400"), children: [_jsx("span", { className: "w-6 text-center font-mono", children: p.position }), _jsx("span", { className: "flex-1 truncate", children: p.name }), _jsx("span", { className: "w-6 text-right", children: p.rating })] }, p.id))) })] }));
}
//# sourceMappingURL=HalfTimePopup.js.map