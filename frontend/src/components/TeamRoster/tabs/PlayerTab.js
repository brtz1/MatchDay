import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import statsService from "@/services/statsService";
function isContractExpired(player) {
    if (player.underContract === false || player.underContract === undefined)
        return true;
    if (player.contractUntil) {
        const contractDate = typeof player.contractUntil === "number"
            ? new Date(player.contractUntil)
            : new Date(player.contractUntil);
        return contractDate.getTime() < Date.now();
    }
    return true;
}
function contractDateString(contractUntil) {
    if (!contractUntil)
        return "";
    const d = typeof contractUntil === "number"
        ? new Date(contractUntil)
        : new Date(contractUntil);
    return d.toISOString().slice(0, 10);
}
export default function PlayerTab({ selectedPlayer, onRenewContract, onSell, renderActions, // NEW: Accept custom actions
 }) {
    const [stats, setStats] = useState(null);
    const [statsError, setStatsError] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    useEffect(() => {
        if (!selectedPlayer) {
            setStats(null);
            setStatsError(null);
            return;
        }
        setStats(null);
        setStatsError(null);
        setStatsLoading(true);
        statsService
            .getPlayerStats(selectedPlayer.id)
            .then(setStats)
            .catch(() => {
            setStatsError("Could not load stats");
            setStats(null);
        })
            .finally(() => setStatsLoading(false));
    }, [selectedPlayer]);
    if (!selectedPlayer) {
        return _jsx("div", { className: "h-full flex items-center justify-center text-gray-300", children: "Select a player to view details." });
    }
    const contractExpired = isContractExpired(selectedPlayer);
    const hasStats = Array.isArray(stats) && stats.length > 0;
    const gamesPlayed = hasStats ? stats.length : 0;
    const goals = hasStats ? stats.reduce((acc, s) => acc + (s.goals || 0), 0) : 0;
    const redCards = hasStats ? stats.reduce((acc, s) => acc + (s.red || 0), 0) : 0;
    const injuries = hasStats ? stats.reduce((acc, s) => acc + (s.injuries || 0), 0) : 0;
    return (_jsxs("div", { className: "w-full h-full flex flex-col gap-6 p-0", children: [_jsxs("div", { className: "flex flex-wrap gap-6 items-baseline w-full", children: [_jsx("div", { className: "text-xl font-bold tracking-wide", children: selectedPlayer.name }), _jsxs("div", { className: "flex flex-wrap gap-4 text-base font-medium", children: [_jsxs("span", { children: ["Rating: ", selectedPlayer.rating] }), selectedPlayer.salary && (_jsxs("span", { children: ["Salary: \u20AC", selectedPlayer.salary.toLocaleString()] })), selectedPlayer.nationality && (_jsxs("span", { children: ["Nationality: ", selectedPlayer.nationality] })), "contractUntil" in selectedPlayer &&
                                typeof selectedPlayer.contractUntil !== "undefined" &&
                                selectedPlayer.contractUntil !== null && (_jsxs("span", { children: ["Contract:", " ", contractExpired ? (_jsx("span", { className: "text-red-400 font-bold", children: "Expired" })) : (_jsxs(_Fragment, { children: ["Until ", contractDateString(selectedPlayer.contractUntil)] }))] })), (selectedPlayer.underContract === false ||
                                selectedPlayer.contractUntil === null ||
                                typeof selectedPlayer.contractUntil === "undefined") && (_jsx("span", { className: "text-red-400 font-bold", children: "Free Agent" }))] })] }), _jsxs("div", { className: "bg-[#193661] rounded-xl px-6 py-4 border border-[#1e335a] shadow-lg flex flex-col gap-2 w-full", children: [_jsx("div", { className: "mb-1 font-bold text-[1.1rem] tracking-wide text-blue-200 uppercase", children: "Player Stats" }), statsLoading ? (_jsx("div", { className: "text-blue-300", children: "Loading stats\u2026" })) : statsError ? (_jsx("div", { className: "text-red-300", children: statsError })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Games played:" }), _jsx("span", { children: gamesPlayed })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Goals:" }), _jsx("span", { children: goals })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Goals this season:" }), _jsx("span", { children: goals })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Red cards:" }), _jsx("span", { children: redCards })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Injuries:" }), _jsx("span", { children: injuries })] })] }))] }), _jsx("div", { className: "flex gap-4 mt-3", children: renderActions
                    ? renderActions(selectedPlayer) // <-- Custom actions if provided
                    : (_jsxs(_Fragment, { children: [_jsx("button", { className: `bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded font-semibold text-black shadow-md transition
                  ${!contractExpired ? "opacity-50 cursor-not-allowed" : ""}
                `, onClick: () => contractExpired && onRenewContract?.(selectedPlayer), disabled: !contractExpired, children: "Renew Contract" }), _jsx("button", { className: "bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold text-white shadow-md transition", onClick: () => onSell?.(selectedPlayer), children: "Sell" })] })) })] }));
}
//# sourceMappingURL=PlayerTab.js.map