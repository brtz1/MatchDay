import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { getGameState, finalizeStandings } from "@/services/axios";
import CupBracket from "@/components/cup/CupBracket";
import { useGameState } from "@/store/GameStateStore";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { teamUrl } from "@/utils/paths";
export default function CupLogPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const cameFromResults = Boolean(location.state?.cameFromResults);
    const { coachTeamId, saveGameId: storeSaveId } = useGameState();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Load cup log (renders only rounds that exist; no placeholders created here)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await api.get("/cup/log");
                if (!alive)
                    return;
                const flat = res.data.flatMap((round) => round.matches.map((m) => ({
                    id: m.id,
                    homeTeamId: m.homeTeamId,
                    awayTeamId: m.awayTeamId,
                    homeTeam: m.homeTeam.name,
                    awayTeam: m.awayTeam.name,
                    homeGoals: m.homeTeam.goals,
                    awayGoals: m.awayTeam.goals,
                    matchdayNumber: round.matchdayNumber,
                    stage: round.roundLabel,
                })));
                flat.sort((a, b) => a.matchdayNumber === b.matchdayNumber ? a.id - b.id : a.matchdayNumber - b.matchdayNumber);
                setMatches(flat);
            }
            catch (e) {
                console.error("Failed to load cup log:", e);
                setError("Failed to load cup bracket.");
            }
            finally {
                if (alive)
                    setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);
    // Same "grace timer" behavior as StandingsPage:
    // If we came from RESULTS, call finalize (advance stage/next matchday) then go to TeamRoster.
    useEffect(() => {
        if (!cameFromResults)
            return;
        const resolveSaveId = async () => {
            if (typeof storeSaveId === "number" && !Number.isNaN(storeSaveId))
                return storeSaveId;
            try {
                const gs = await getGameState();
                return gs?.currentSaveGameId ?? undefined;
            }
            catch {
                return undefined;
            }
        };
        let cancelled = false;
        (async () => {
            const resolved = await resolveSaveId();
            if (!resolved || !coachTeamId)
                return;
            const t = setTimeout(async () => {
                if (cancelled)
                    return;
                try {
                    // Reuse the same backend finalize used by StandingsPage.
                    const res = await finalizeStandings(resolved);
                    const targetCoach = res.coachTeamId ?? coachTeamId;
                    navigate(teamUrl(targetCoach), { replace: true });
                }
                catch (e) {
                    console.warn("[CupLog] finalize failed; routing anyway", e);
                    navigate(teamUrl(coachTeamId), { replace: true });
                }
            }, 3000);
            // cleanup
            return () => clearTimeout(t);
        })();
        return () => {
            cancelled = true;
        };
    }, [cameFromResults, storeSaveId, coachTeamId, navigate]);
    return (_jsxs("div", { className: "relative flex flex-col gap-4 p-4 w-full min-h-screen bg-gradient-to-b from-green-800 via-green-900 to-green-950", children: [_jsx("div", { className: "absolute right-6 top-6 z-10", children: _jsx(AppButton, { variant: "secondary", onClick: () => coachTeamId ? navigate(teamUrl(coachTeamId)) : navigate(-1), className: "!px-6 !py-2", children: "\u2190 Back" }) }), _jsx("h1", { className: "text-3xl font-extrabold text-yellow-300 tracking-tight drop-shadow-md text-center uppercase", children: "Cup Bracket" }), _jsx(AppCard, { variant: "default", className: "w-full rounded-2xl border-2 border-yellow-500 bg-yellow-300 shadow-xl p-0", children: _jsx("div", { className: "w-full max-h-[calc(100vh-220px)] rounded-xl bg-yellow-300 shadow-inner overflow-auto pl-px", children: loading ? (_jsx("div", { className: "flex w-full justify-center py-10", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-4 border-blue-700" }) })) : error ? (_jsx("div", { className: "py-10 mx-auto text-center text-red-700", children: error })) : matches.length === 0 ? (_jsx("div", { className: "py-10 mx-auto text-center text-blue-900", children: "No cup data available yet." })) : (_jsx(CupBracket, { matches: matches })) }) })] }));
}
//# sourceMappingURL=CupLogPage.js.map