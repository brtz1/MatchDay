import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// frontend/src/pages/HalfTimePopup.tsx
import { useState, useEffect, useMemo } from "react";
import clsx from "clsx";
import Modal from "@/components/common/Modal";
import { AppButton } from "@/components/common/AppButton";
import MatchEventFeed from "@/components/MatchBroadcast/MatchEventFeed";
/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function HalfTimePopup({ open, onClose, events, lineup, bench, subsRemaining, onSubstitute, canSubstitute, pauseReason, incidentPlayer, mode, }) {
    const [selectedOut, setSelectedOut] = useState(null);
    const [selectedIn, setSelectedIn] = useState(null);
    // If mode not provided, infer ET vs HT from pauseReason
    const effectiveMode = mode ?? (pauseReason === "ET_HALF" ? "ET" : "HT");
    // Reset selections when reopened/disabled or out of subs
    useEffect(() => {
        if (!open || !canSubstitute || subsRemaining === 0) {
            setSelectedOut(null);
            setSelectedIn(null);
        }
    }, [open, canSubstitute, subsRemaining]);
    const isGK = (pos) => (pos || "").toUpperCase() === "GK";
    const gkOnFieldCount = useMemo(() => lineup.filter((p) => isGK(p.position)).length, [lineup]);
    const hasBenchGK = useMemo(() => bench.some((p) => isGK(p.position)), [bench]);
    const selectedOutIsGK = useMemo(() => (selectedOut != null ? isGK(lineup.find((p) => p.id === selectedOut)?.position) : false), [selectedOut, lineup]);
    const selectedInIsGK = useMemo(() => (selectedIn != null ? isGK(bench.find((p) => p.id === selectedIn)?.position) : false), [selectedIn, bench]);
    // Validation for the substitution button (mirror backend constraints for UX)
    let validationMessage = null;
    if (selectedInIsGK && gkOnFieldCount >= 1 && !selectedOutIsGK) {
        validationMessage = "You cannot play with two goalkeepers. Swap GK for GK.";
    }
    if (selectedOutIsGK && !selectedInIsGK) {
        validationMessage = "Goalkeeper can only be substituted by another goalkeeper.";
    }
    function commitSub(e) {
        e.preventDefault();
        if (selectedOut == null || selectedIn == null)
            return;
        if (validationMessage)
            return;
        onSubstitute({ out: selectedOut, in: selectedIn });
        setSelectedOut(null);
        setSelectedIn(null);
    }
    const disableCommit = !canSubstitute ||
        selectedOut == null ||
        selectedIn == null ||
        selectedOut === selectedIn ||
        subsRemaining <= 0 ||
        !!validationMessage;
    const helperText = !canSubstitute
        ? "You can only make substitutions for the team you coach."
        : subsRemaining <= 0
            ? "No substitutions remaining (max 3)."
            : selectedOut == null || selectedIn == null
                ? "Select one player on the field and one from the bench."
                : selectedOut === selectedIn
                    ? "Choose two different players."
                    : validationMessage ?? "";
    // Friendly guidance based on pauseReason (no enforcement)
    const banner = (() => {
        switch (pauseReason) {
            case "GK_INJURY":
                if (gkOnFieldCount === 0 && hasBenchGK) {
                    return "Goalkeeper injured. Tip: you can bring on a goalkeeper from the bench (optional).";
                }
                if (gkOnFieldCount === 0 && !hasBenchGK) {
                    return "Goalkeeper injured. No reserve goalkeeper available — you may continue without a GK.";
                }
                return "Goalkeeper injured. Review your lineup and substitutions if you wish.";
            case "GK_RED_NEEDS_GK":
                if (gkOnFieldCount === 0 && hasBenchGK) {
                    return "Goalkeeper sent off. Tip: you can bring on a goalkeeper now (optional).";
                }
                if (gkOnFieldCount === 0 && !hasBenchGK) {
                    return "Goalkeeper sent off. No reserve goalkeeper available — you will continue without a GK.";
                }
                return "Goalkeeper sent off. Review your lineup and substitutions if you wish.";
            case "INJURY":
                return "Player injured. You may substitute, or resume the match without a sub.";
            case "COACH_PAUSE":
                return "Coaching pause. Make changes if needed, then resume the match.";
            case "HALFTIME":
            case "ET_HALF":
            default: {
                if (effectiveMode === "ET") {
                    return "Extra time half-time. Make substitutions if needed, then resume extra time.";
                }
                return "Half-time. Make substitutions if needed, then resume the second half.";
            }
        }
    })();
    const normalizePos = (pos) => {
        const s = (pos || "").toUpperCase();
        if (s === "G" || s === "GOALKEEPER")
            return "GK";
        if (s === "D" || s === "DEF" || s === "DEFENDER")
            return "DF";
        if (s === "M" || s === "MID" || s === "MIDFIELDER")
            return "MF";
        if (s === "F" || s === "FW" || s === "ATT" || s === "ATTACKER" || s === "ST")
            return "AT";
        return s || "MF";
    };
    // Incident header (optional)
    const incidentHeader = (() => {
        if (!incidentPlayer)
            return null;
        const pos = normalizePos(incidentPlayer.position);
        const rating = typeof incidentPlayer.rating === "number" && !Number.isNaN(incidentPlayer.rating)
            ? `, ${incidentPlayer.rating}`
            : "";
        if (pauseReason === "INJURY" || pauseReason === "GK_INJURY") {
            return (_jsxs("div", { className: "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-600/70 dark:bg-red-900/20 dark:text-red-100", children: [_jsx("span", { className: "mr-1", children: "\uD83D\uDE91" }), _jsx("strong", { children: incidentPlayer.name }), ` (${pos}${rating})`, " got injured."] }));
        }
        if (pauseReason === "GK_RED_NEEDS_GK") {
            return (_jsxs("div", { className: "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-600/70 dark:bg-red-900/20 dark:text-red-100", children: [_jsx("span", { className: "mr-1", children: "\uD83D\uDFE5" }), "GK sent off: ", _jsx("strong", { children: incidentPlayer.name }), ` (${pos}${rating})`] }));
        }
        return null;
    })();
    // Title: show ET label when applicable
    const titleText = effectiveMode === "ET" ? "Extra Time – Half-time" : "Match Paused";
    return (_jsxs(Modal, { open: open, onClose: onClose, title: titleText, size: "lg", isLocked: false, className: "flex flex-col gap-4", children: [incidentHeader, _jsx("div", { className: "rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 dark:border-yellow-600/70 dark:bg-yellow-900/20 dark:text-yellow-100", children: banner }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200", children: "Match Events" }), _jsx(MatchEventFeed, { events: events, maxHeightRem: 18 })] }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsxs("h3", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: ["Substitutions ", _jsxs("span", { className: "opacity-70", children: ["(remaining ", subsRemaining, ")"] })] }), _jsx("p", { className: "text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400", children: "Max 3 per match" })] }), _jsx(RosterList, { kind: "lineup", title: `On Field ${gkOnFieldCount ? "(GK present)" : "(no GK)"}`, players: lineup, selected: selectedOut, onSelect: canSubstitute && subsRemaining > 0 ? setSelectedOut : noopSelect }), _jsx(RosterList, { kind: "bench", title: `Bench ${hasBenchGK ? "(GK available)" : ""}`, players: bench, selected: selectedIn, onSelect: canSubstitute && subsRemaining > 0 ? setSelectedIn : noopSelect }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: clsx("text-xs", validationMessage ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"), children: selectedOut != null && selectedIn != null ? (_jsxs(_Fragment, { children: ["Selected: ", _jsxs("strong", { children: ["#", selectedOut] }), " \u2192 ", _jsxs("strong", { children: ["#", selectedIn] }), validationMessage ? _jsxs("span", { className: "ml-2", children: ["\u2022 ", validationMessage] }) : null] })) : (_jsx("span", { className: "opacity-80", children: helperText })) }), canSubstitute && (_jsx(AppButton, { onClick: commitSub, disabled: disableCommit, children: "Confirm Sub" }))] })] })] }), _jsx("div", { className: "mt-4 flex justify-end gap-2", children: _jsx(AppButton, { variant: "ghost", onClick: onClose, children: "Resume Match" }) })] }));
}
/* -------------------------------------------------------------------------- */
/* Helper – RosterList                                                        */
/* -------------------------------------------------------------------------- */
function RosterList({ kind, title, players, selected, onSelect, }) {
    const normalizePos = (pos) => {
        const s = (pos || "").toUpperCase();
        if (s === "G" || s === "GOALKEEPER")
            return "GK";
        if (s === "D" || s === "DEF" || s === "DEFENDER")
            return "DF";
        if (s === "M" || s === "MID" || s === "MIDFIELDER")
            return "MF";
        if (s === "F" || s === "FW" || s === "ATT" || s === "ATTACKER" || s === "ST")
            return "AT";
        return s || "MF";
    };
    const POS_ORDER = { GK: 0, DF: 1, MF: 2, AT: 3 };
    const posRank = (p) => POS_ORDER[normalizePos(p.position)] ?? 99;
    // Always show GK → DF → MF → AT; then rating DESC; then name ASC
    const sorted = useMemo(() => {
        return [...players].sort((a, b) => {
            const ra = posRank(a);
            const rb = posRank(b);
            if (ra !== rb)
                return ra - rb;
            if (b.rating !== a.rating)
                return b.rating - a.rating;
            return a.name.localeCompare(b.name);
        });
    }, [players]);
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400", children: title }), _jsx("div", { className: "max-h-40 overflow-y-auto rounded border border-gray-200 dark:border-gray-700", children: sorted.map((p, idx) => {
                    // Injured players:
                    //  - LINEUP: selectable (must be able to sub OUT)
                    //  - BENCH: disabled (cannot sub IN)
                    const isDisabled = kind === "bench" ? p.isInjured : false;
                    return (_jsxs("button", { type: "button", onClick: () => !isDisabled && onSelect(p.id), className: clsx("flex w-full items-center gap-2 px-2 py-[6px] text-left text-xs transition-colors", idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/20" : "bg-white dark:bg-gray-800", selected === p.id && "bg-yellow-200 dark:bg-yellow-600/40", isDisabled
                            ? "cursor-not-allowed line-through text-red-600 dark:text-red-400"
                            : p.isInjured && kind === "lineup"
                                ? "text-red-600 dark:text-red-400"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700"), children: [_jsx("span", { className: "w-6 text-center font-mono", children: normalizePos(p.position) }), _jsx("span", { className: "flex-1 truncate", children: p.name }), _jsx("span", { className: "w-6 text-right", children: p.rating })] }, p.id));
                }) })] }));
}
function noopSelect(_) {
    /* no-op when user can't substitute */
}
//# sourceMappingURL=HalfTimePopup.js.map