import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentStandings, getGameState, finalizeStandings, } from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import TopNavBar from "@/components/common/TopNavBar";
import { useGameState } from "@/store/GameStateStore";
import { teamUrl } from "@/utils/paths";
export default function StandingsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const cameFromResults = Boolean(location.state?.cameFromResults);
    const { coachTeamId, saveGameId: storeSaveId } = useGameState();
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Load grouped standings
    useEffect(() => {
        let disposed = false;
        async function resolveSaveId() {
            if (typeof storeSaveId === "number" && !Number.isNaN(storeSaveId))
                return storeSaveId;
            try {
                const gs = await getGameState();
                return gs?.currentSaveGameId ?? undefined;
            }
            catch {
                return undefined;
            }
        }
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const resolved = await resolveSaveId();
                if (!resolved)
                    throw new Error("No active save found.");
                // BE returns an array of divisions; each may have .rows (new) and/or .teams (legacy)
                const raw = await getCurrentStandings(resolved);
                // Normalize to our local DivisionGroup shape
                const normalized = Array.isArray(raw)
                    ? raw.map((div) => {
                        const division = String(div?.division ?? "");
                        // Prefer legacy teams if present; otherwise map new rows -> legacy fields
                        const teams = Array.isArray(div?.teams)
                            ? div.teams.map((t) => ({
                                teamId: Number(t.teamId ?? t.id),
                                name: String(t.name ?? ""),
                                played: Number(t.played ?? 0),
                                won: Number(t.won ?? 0),
                                draw: Number(t.draw ?? 0),
                                lost: Number(t.lost ?? 0),
                                goalsFor: Number(t.goalsFor ?? 0),
                                goalsAgainst: Number(t.goalsAgainst ?? 0),
                                goalDifference: Number(t.goalDifference ??
                                    (Number(t.goalsFor ?? 0) - Number(t.goalsAgainst ?? 0))),
                                points: Number(t.points ?? 0),
                                position: Number(t.position ?? 0),
                            }))
                            : Array.isArray(div?.rows)
                                ? div.rows.map((r) => ({
                                    teamId: Number(r.teamId ?? r.id),
                                    name: String(r.name ?? ""),
                                    played: Number(r.played ?? 0),
                                    won: Number(r.wins ?? 0),
                                    draw: Number(r.draws ?? 0),
                                    lost: Number(r.losses ?? 0),
                                    goalsFor: Number(r.gf ?? 0),
                                    goalsAgainst: Number(r.ga ?? 0),
                                    goalDifference: Number(r.gd ?? (Number(r.gf ?? 0) - Number(r.ga ?? 0))),
                                    points: Number(r.points ?? 0),
                                    position: Number(r.position ?? 0),
                                }))
                                : [];
                        return { division, teams };
                    })
                    : [];
                if (!disposed)
                    setDivisions(normalized);
            }
            catch (e) {
                console.error("[Standings] Failed to load standings:", e);
                if (!disposed)
                    setError("Failed to load standings.");
            }
            finally {
                if (!disposed)
                    setLoading(false);
            }
        })();
        return () => {
            disposed = true;
        };
    }, [storeSaveId]);
    // Grace timer ONLY when we came from RESULTS → Standings
    useEffect(() => {
        if (!cameFromResults)
            return;
        const resolved = typeof storeSaveId === "number" ? storeSaveId : undefined;
        if (!resolved || !coachTeamId)
            return;
        const t = setTimeout(async () => {
            try {
                const res = await finalizeStandings(resolved);
                const targetCoach = res.coachTeamId ?? coachTeamId;
                navigate(teamUrl(targetCoach), { replace: true, state: { cameFromResults: true } });
            }
            catch (e) {
                console.warn("[Standings] finalize failed; routing anyway", e);
                navigate(teamUrl(coachTeamId), { replace: true, state: { cameFromResults: true } });
            }
        }, 3000);
        return () => clearTimeout(t);
    }, [cameFromResults, storeSaveId, coachTeamId, navigate]);
    // Stable ordering in grid
    const gridDivisions = useMemo(() => {
        const byKey = new Map(divisions.map((d) => [String(d.division), d]));
        return [
            byKey.get("D1") ?? byKey.get("1"),
            byKey.get("D3") ?? byKey.get("3"),
            byKey.get("D2") ?? byKey.get("2"),
            byKey.get("D4") ?? byKey.get("4"),
        ].filter(Boolean);
    }, [divisions]);
    return (_jsxs("div", { className: "relative mx-auto flex max-w-5xl flex-col gap-6 p-6", children: [_jsx(TopNavBar, { coachTeamId: coachTeamId ?? -1 }), _jsx("h1", { className: "mb-4 text-center text-3xl font-extrabold tracking-tight text-blue-700 drop-shadow-sm dark:text-blue-300", children: "League Standings" }), loading ? (_jsx(ProgressBar, { className: "mx-auto w-64" })) : error ? (_jsx("p", { className: "text-red-500", children: error })) : divisions.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "No standings available." })) : (_jsx("div", { className: "grid grid-cols-1 gap-6 md:grid-cols-2", children: gridDivisions.map((div) => div ? _jsx(DivisionCard, { div: div, navigate: navigate }, String(div.division)) : null) }))] }));
}
function DivisionCard({ div, navigate, }) {
    return (_jsxs(AppCard, { variant: "default", className: "mb-0 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-200/80 shadow-lg dark:border-blue-900 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-800/80", children: [_jsx("div", { className: "mb-4 flex items-center rounded-lg bg-blue-100 px-4 py-2 shadow-inner dark:bg-blue-900/60", children: _jsx("h2", { className: "text-2xl font-bold uppercase tracking-wide text-blue-700 dark:text-yellow-300", children: divisionNamePretty(String(div.division)) }) }), _jsx("div", { className: "overflow-x-auto rounded-xl bg-white/90 p-0 shadow-inner dark:bg-gray-950/60", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/70", children: _jsxs("tr", { className: "text-center font-semibold text-blue-700 dark:text-blue-200", children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Team" }), _jsx("th", { children: "Pts" }), _jsx("th", { children: "Pl" }), _jsx("th", { children: "W" }), _jsx("th", { children: "D" }), _jsx("th", { children: "L" }), _jsx("th", { children: "GF" }), _jsx("th", { children: "GA" }), _jsx("th", { children: "GD" })] }) }), _jsx("tbody", { children: div.teams.map((team, idx) => (_jsxs("tr", { className: `transition-colors duration-100 ${idx % 2 === 0
                                    ? "bg-blue-50 dark:bg-blue-900/30"
                                    : "bg-blue-100/60 dark:bg-blue-950/30"} hover:bg-yellow-100 dark:hover:bg-yellow-900/30`, children: [_jsx("td", { className: "px-3 py-2 text-left font-medium", children: _jsx("button", { className: "text-blue-600 underline transition-colors hover:text-yellow-700 dark:text-yellow-300 dark:hover:text-yellow-100", onClick: () => navigate(teamUrl(team.teamId), { state: { cameFromResults } }), children: team.name }) }), _jsx("td", { className: "text-center font-bold", children: team.points }), _jsx("td", { className: "text-center", children: team.played }), _jsx("td", { className: "text-center", children: team.won }), _jsx("td", { className: "text-center", children: team.draw }), _jsx("td", { className: "text-center", children: team.lost }), _jsx("td", { className: "text-center", children: team.goalsFor }), _jsx("td", { className: "text-center", children: team.goalsAgainst }), _jsx("td", { className: "text-center", children: team.goalDifference })] }, team.teamId))) })] }) })] }));
}
function divisionNamePretty(division) {
    switch (division) {
        case "D1":
        case "1":
            return "Division 1";
        case "D2":
        case "2":
            return "Division 2";
        case "D3":
        case "3":
            return "Division 3";
        case "D4":
        case "4":
            return "Division 4";
        default:
            return division;
    }
}
//# sourceMappingURL=StandingsPage.js.map
