import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
const isGK = (pos) => (pos ?? "").toUpperCase() === "GK" || (pos ?? "").toUpperCase() === "GOALKEEPER";
export default function GKRedPopup({ open, lineup, bench, subsRemaining, isHomeTeam, onConfirmSub, onResume, title = "Goalkeeper Sent Off", confirmLabel = "Confirm substitution", resumeLabel = "Resume match", }) {
    // Select one field player (out) and one bench player (in; GK optional)
    const [selectedOutId, setSelectedOutId] = useState(null);
    const [selectedInId, setSelectedInId] = useState(null);
    // Count any GKs still on the field (should be 0 after the red, but be defensive)
    const gkOnField = useMemo(() => lineup.filter((p) => isGK(p.position)).length, [lineup]);
    // Eligible OUT candidates: on-pitch **non-GK** players
    const outCandidates = useMemo(() => lineup.filter((p) => !isGK(p.position)), [lineup]);
    // Eligible IN candidates: **all** bench players; but prevent selecting a GK if a GK is already on
    const benchCandidates = useMemo(() => {
        if (gkOnField >= 1) {
            return bench.filter((p) => !isGK(p.position));
        }
        return bench;
    }, [bench, gkOnField]);
    const noBenchChoices = benchCandidates.length === 0;
    const noOutChoices = outCandidates.length === 0;
    const selectedInIsGK = selectedInId != null && isGK(bench.find((b) => b.id === selectedInId)?.position);
    const confirmDisabled = !open ||
        subsRemaining <= 0 ||
        noBenchChoices ||
        noOutChoices ||
        selectedOutId == null ||
        selectedInId == null ||
        (gkOnField >= 1 && selectedInIsGK); // can't add a GK if one is already on
    const handleConfirm = async () => {
        if (selectedOutId == null || selectedInId == null)
            return;
        await onConfirmSub({ out: selectedOutId, in: selectedInId });
        setSelectedOutId(null);
        setSelectedInId(null);
    };
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4", children: _jsxs("div", { className: "w-full max-w-4xl rounded-2xl bg-white p-5 text-gray-900 shadow-xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold", children: title }), _jsx("span", { className: "rounded bg-gray-100 px-2 py-1 text-xs font-semibold", children: isHomeTeam ? "Home" : "Away" })] }), _jsxs("div", { className: "mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800", children: [_jsx("p", { className: "font-semibold", children: "Your goalkeeper was sent off." }), _jsx("p", { className: "mt-1", children: "You may resume play immediately, or make a substitution now. You can:" }), _jsxs("ul", { className: "mt-2 list-disc pl-5 text-xs text-red-700", children: [_jsxs("li", { children: ["remove ", _jsx("strong", { children: "any field player" }), " and bring on", " ", _jsx("strong", { children: "any bench player" }), " (GK or not);"] }), _jsx("li", { children: "only one goalkeeper is allowed on the field at a time;" }), _jsx("li", { children: "a substitution will be consumed if you confirm a change." })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-xl border border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2", children: [_jsx("span", { className: "text-sm font-semibold", children: "Select field player to remove" }), _jsxs("span", { className: "text-xs text-gray-500", children: [outCandidates.length, " available"] })] }), _jsx("div", { className: "max-h-72 overflow-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-50", children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Player" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Pos" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Rating" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: outCandidates.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-3 py-3 text-center text-gray-500", children: "No field players available to remove." }) })) : (outCandidates.map((p) => {
                                                    const active = selectedOutId === p.id;
                                                    return (_jsxs("tr", { onClick: () => setSelectedOutId(p.id), className: `cursor-pointer ${active ? "bg-yellow-50" : "hover:bg-gray-50"}`, children: [_jsx("td", { className: "px-3 py-2", children: p.name }), _jsx("td", { className: "px-3 py-2", children: p.position }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: p.rating })] }, p.id));
                                                })) })] }) })] }), _jsxs("div", { className: "rounded-xl border border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2", children: [_jsx("span", { className: "text-sm font-semibold", children: "Select reserve to bring on" }), _jsxs("span", { className: "text-xs text-gray-500", children: [benchCandidates.length, " available"] })] }), _jsx("div", { className: "max-h-72 overflow-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-50", children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Player" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Pos" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Rating" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: benchCandidates.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-3 py-3 text-center text-gray-500", children: "No eligible reserves available." }) })) : (benchCandidates.map((p) => {
                                                    const active = selectedInId === p.id;
                                                    const gkBadge = isGK(p.position) && gkOnField === 0 ? (_jsx("span", { className: "ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800", children: "GK recommended" })) : null;
                                                    return (_jsxs("tr", { onClick: () => setSelectedInId(p.id), className: `cursor-pointer ${active ? "bg-green-50" : "hover:bg-gray-50"}`, children: [_jsxs("td", { className: "px-3 py-2", children: [p.name, gkBadge] }), _jsx("td", { className: "px-3 py-2", children: p.position }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: p.rating })] }, p.id));
                                                })) })] }) })] })] }), _jsxs("div", { className: "mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "text-xs text-gray-500", children: ["Subs remaining: ", _jsx("span", { className: "font-semibold", children: subsRemaining }), gkOnField >= 1 && (_jsx("span", { className: "ml-2 text-red-600", children: "\u00B7 A goalkeeper is already on the field \u2014 you can\u2019t add another." }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: onResume, className: "rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300", title: "Resume without making a substitution", children: resumeLabel }), _jsx("button", { type: "button", disabled: confirmDisabled, onClick: handleConfirm, className: `rounded-xl px-4 py-2 text-sm font-semibold text-white ${confirmDisabled ? "bg-green-400/60 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`, title: subsRemaining <= 0
                                        ? "No substitutions remaining"
                                        : noBenchChoices
                                            ? "No eligible reserves available"
                                            : noOutChoices
                                                ? "No field player available to remove"
                                                : gkOnField >= 1 && selectedInIsGK
                                                    ? "There is already a goalkeeper on the field"
                                                    : "", children: confirmLabel })] })] })] }) }));
}
//# sourceMappingURL=GKRedPopup.js.map