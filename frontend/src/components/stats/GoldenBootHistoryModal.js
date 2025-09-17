import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/components/stats/GoldenBootHistoryModal.tsx
import * as React from "react";
import statsService from "@/services/statsService";
import { useGameState } from "@/store/GameStateStore";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
export default function GoldenBootHistoryModal({ isOpen, onClose, limit = 10 }) {
    const gs = useGameState();
    const saveGameId = gs.saveGameId ?? gs.currentSaveGameId;
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        if (!isOpen)
            return;
        if (!saveGameId) {
            setRows([]);
            setError("SaveGame not ready");
            return;
        }
        let mounted = true;
        setLoading(true);
        setError(null);
        statsService
            .getGoldenBootHistory({ saveGameId, limit })
            .then((res) => {
            if (!mounted)
                return;
            setRows(res.top ?? []);
        })
            .catch((e) => {
            console.error(e);
            if (mounted)
                setError("Failed to load Golden Boot History");
        })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [isOpen, saveGameId, limit]);
    React.useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape")
                onClose();
        };
        if (isOpen)
            window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4", children: _jsxs(AppCard, { className: "w-full max-w-2xl bg-[#0b1a2b] text-white border border-yellow-400/40 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "font-mono text-lg uppercase text-yellow-300", children: "Golden Boot History" }), _jsx(AppButton, { onClick: onClose, className: "bg-yellow-400 text-black hover:bg-yellow-500", children: "Close" })] }), loading && (_jsx("div", { className: "py-6 text-center text-gray-200 font-mono", children: "Loading\u2026" })), !loading && error && (_jsx("div", { className: "py-6 text-red-300 font-mono", children: error })), !loading && !error && (_jsx("div", { className: "overflow-auto max-h-[60vh]", children: _jsxs("table", { className: "w-full text-sm font-mono", children: [_jsx("thead", { className: "sticky top-0 bg-black/30", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-2", children: "#" }), _jsx("th", { className: "text-left p-2", children: "Player" }), _jsx("th", { className: "text-left p-2", children: "Team" }), _jsx("th", { className: "text-left p-2", children: "Pos" }), _jsx("th", { className: "text-right p-2", children: "Goals (All Seasons)" })] }) }), _jsx("tbody", { children: rows.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "p-4 text-center text-gray-300", children: "No scorers yet." }) })) : (rows.map((r) => (_jsxs("tr", { className: "odd:bg-white/5", children: [_jsx("td", { className: "p-2", children: r.rank }), _jsx("td", { className: "p-2", children: r.name }), _jsx("td", { className: "p-2", children: r.teamName ?? "-" }), _jsx("td", { className: "p-2", children: r.position ?? "-" }), _jsx("td", { className: "p-2 text-right", children: r.goals })] }, `${r.saveGamePlayerId ?? "base"}-${r.name}`)))) })] }) }))] }) }));
}
//# sourceMappingURL=GoldenBootHistoryModal.js.map