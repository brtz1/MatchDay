import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
export default function InjuryPopup({ open, injured, lineup, bench, subsRemaining, isHomeTeam, onConfirmSub, onResumeNoSub, title = "Player Injured", confirmLabel = "Confirm substitution", resumeLabel = "Resume match", }) {
    const [selectedReserveId, setSelectedReserveId] = useState(null);
    const injuredIsGK = (injured.position ?? "").toUpperCase() === "GK";
    // Count GKs currently on the field (injured may still be on the field until action)
    const gkOnField = useMemo(() => lineup.filter((p) => (p.position ?? "").toUpperCase() === "GK").length, [lineup]);
    // Eligible bench:
    // - If injured is GK → only bench GKs
    // - If injured is NOT GK and a GK is already on field → disallow choosing GK
    // - Else → any bench player
    const selectableBench = useMemo(() => {
        const isGK = (pos) => (pos ?? "").toUpperCase() === "GK";
        if (injuredIsGK)
            return bench.filter((b) => isGK(b.position));
        if (gkOnField >= 1)
            return bench.filter((b) => !isGK(b.position));
        return bench;
    }, [bench, injuredIsGK, gkOnField]);
    const confirmDisabled = !open ||
        subsRemaining <= 0 ||
        selectedReserveId == null ||
        selectableBench.findIndex((p) => p.id === selectedReserveId) === -1;
    const handleConfirm = async () => {
        if (confirmDisabled || selectedReserveId == null)
            return;
        await onConfirmSub({ out: injured.id, in: selectedReserveId });
        setSelectedReserveId(null);
    };
    const handleResumeNoSub = async () => {
        await onResumeNoSub(injured.id);
        setSelectedReserveId(null);
    };
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4", children: _jsxs("div", { className: "w-full max-w-3xl rounded-2xl bg-white p-5 text-gray-900 shadow-xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold", children: title }), _jsx("span", { className: "rounded bg-gray-100 px-2 py-1 text-xs font-semibold", children: isHomeTeam ? "Home" : "Away" })] }), _jsxs("div", { className: "mb-5 rounded-lg bg-red-50 p-4", children: [_jsxs("div", { className: "text-sm text-red-800", children: [_jsx("span", { className: "font-semibold", children: injured.name }), " ", _jsxs("span", { className: "opacity-80", children: ["(", injured.position, typeof injured.rating === "number" ? ` · Rating ${injured.rating}` : "", ")"] }), " ", "got injured. Pick a reserve to be subbed in, or resume to play with 10."] }), _jsx("div", { className: "mt-1 text-xs text-red-700", children: injuredIsGK
                                ? "If a goalkeeper is available on the bench, you must field one."
                                : "Confirm is enabled only after you choose a reserve." })] }), _jsx("div", { className: "max-h-72 overflow-auto rounded-xl border border-gray-200", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Reserve" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Pos" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Rating" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: selectableBench.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-3 py-3 text-center text-gray-500", children: "No eligible reserves available." }) })) : (selectableBench.map((p) => {
                                    const active = selectedReserveId === p.id;
                                    return (_jsxs("tr", { onClick: () => setSelectedReserveId(p.id), className: `cursor-pointer ${active ? "bg-green-50" : "hover:bg-gray-50"}`, children: [_jsx("td", { className: "px-3 py-2", children: p.name }), _jsx("td", { className: "px-3 py-2", children: p.position }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: p.rating })] }, p.id));
                                })) })] }) }), _jsxs("div", { className: "mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "text-xs text-gray-500", children: ["Subs remaining: ", _jsx("span", { className: "font-semibold", children: subsRemaining })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: handleResumeNoSub, className: "rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300", title: "Remove injured and resume (play with 10)", children: resumeLabel }), _jsx("button", { type: "button", disabled: confirmDisabled, onClick: handleConfirm, className: `rounded-xl px-4 py-2 text-sm font-semibold text-white ${confirmDisabled
                                        ? "bg-green-400/60 cursor-not-allowed"
                                        : "bg-green-600 hover:bg-green-700"}`, title: subsRemaining <= 0
                                        ? "No substitutions remaining"
                                        : selectedReserveId == null
                                            ? "Select a reserve to confirm"
                                            : "", children: confirmLabel })] })] })] }) }));
}
//# sourceMappingURL=InjuryPopup.js.map