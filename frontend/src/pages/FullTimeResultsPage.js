import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { getGameState, getResultsByMatchday, getMatchesByMatchday, setStage, } from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { useRequiredStage } from "@/hooks/useRequiredStage";
/**
 * Full-Time Results page
 * Flow expectation:
 *   Live (freeze 5s) → Results (this page) → [Proceed] → Standings (auto-close ~30s) → Team Roster (ACTION)
 */
export default function FullTimeResultsPage() {
    useRequiredStage("RESULTS", { redirectTo: "/", graceMs: 1000 });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState([]);
    const [err, setErr] = useState(null);
    const loadResults = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            // 1) Read current matchday from backend (authoritative)
            const gs = await getGameState();
            const md = gs.currentMatchday;
            // 2) Try results summary endpoint first; fallback to fetching matches-by-matchday
            try {
                const summary = await getResultsByMatchday(md);
                setMatches(summary.matches ?? []);
            }
            catch {
                const list = await getMatchesByMatchday(md);
                setMatches(list ?? []);
            }
        }
        catch (e) {
            console.error("[Results] Failed to load results:", e);
            setErr("Failed to load full-time results.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadResults();
    }, [loadResults]);
    const handleProceed = useCallback(async () => {
        try {
            const gs = await getGameState();
            const saveGameId = gs.currentSaveGameId ?? undefined;
            // Prefer the dedicated route if you have it (does stage flip + any post-processing)
            if (typeof saveGameId === "number") {
                try {
                    await api.post("/matchday/advance-after-results", { saveGameId });
                }
                catch (e) {
                    // Fallback: explicitly set stage to STANDINGS if route isn't available
                    await setStage({ saveGameId, stage: "STANDINGS" });
                }
            }
            navigate("/standings");
        }
        catch (e) {
            console.error("❌ Failed to proceed from results:", e);
            setErr("Could not proceed to standings. Try again.");
        }
    }, [navigate]);
    if (loading) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-white", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col gap-4 bg-green-900 p-4 text-white", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Full-Time Results" }), _jsx("div", { className: "text-sm opacity-80", children: "Tap \u201CProceed\u201D to view standings" })] }), err && (_jsx("div", { className: "rounded-md bg-red-600/20 px-3 py-2 text-sm text-red-200", children: err })), _jsx(AppCard, { variant: "outline", className: "bg-white/10 p-4", children: matches.length === 0 ? (_jsx("div", { className: "text-white/80", children: "No results available." })) : (_jsx("div", { className: "grid grid-cols-1 gap-2", children: matches.map((m) => (_jsxs("div", { className: "flex items-center justify-between border-b border-white/15 pb-1 last:border-b-0", children: [_jsx("div", { className: "text-xs uppercase tracking-wide opacity-70", children: m.division }), _jsxs("div", { className: "text-sm tabular-nums", children: [m.homeTeam.name, " ", _jsx("strong", { children: m.homeGoals }), " x", " ", _jsx("strong", { children: m.awayGoals }), " ", m.awayTeam.name] })] }, m.id))) })) }), _jsx("div", { className: "mt-4 self-end", children: _jsx(AppButton, { onClick: handleProceed, children: "Proceed" }) })] }));
}
//# sourceMappingURL=FullTimeResultsPage.js.map