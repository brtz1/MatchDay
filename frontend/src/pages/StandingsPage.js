import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import TopNavBar from "@/components/common/TopNavBar";
import { useGameState } from "@/store/GameStateStore";
import { teamUrl } from "@/utils/paths";
export default function StandingsPage() {
    const [grouped, setGrouped] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { saveGameId, coachTeamId } = useGameState();
    useEffect(() => {
        if (!saveGameId)
            return;
        setLoading(true);
        axios
            .get(`/standings?saveGameId=${saveGameId}`)
            .then(({ data }) => setGrouped(data))
            .catch(() => {
            setError("Failed to load standings");
            setGrouped([]);
        })
            .finally(() => setLoading(false));
    }, [saveGameId]);
    // Auto-navigate to team after 30s ONLY if coming from FullTimeResults
    useEffect(() => {
        if (location.state?.fromResults && coachTeamId) {
            const timeout = setTimeout(() => {
                navigate(`/team/${coachTeamId}`);
            }, 30000);
            return () => clearTimeout(timeout);
        }
    }, [location.state, coachTeamId, navigate]);
    const gridDivisions = [
        grouped.find((d) => d.division === "D1"),
        grouped.find((d) => d.division === "D3"),
        grouped.find((d) => d.division === "D2"),
        grouped.find((d) => d.division === "D4"),
    ];
    return (_jsxs("div", { className: "relative mx-auto flex max-w-5xl flex-col gap-6 p-6", children: [_jsx(TopNavBar, { coachTeamId: coachTeamId ?? -1 }), _jsx("h1", { className: "mb-4 text-3xl font-extrabold text-blue-700 dark:text-blue-300 tracking-tight drop-shadow-sm text-center", children: "League Standings" }), loading ? (_jsx(ProgressBar, { className: "w-64 mx-auto" })) : error ? (_jsx("p", { className: "text-red-500", children: error })) : grouped.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "No standings available." })) : (_jsx("div", { className: "grid grid-cols-1 gap-6 md:grid-cols-2", children: gridDivisions.map((div, idx) => div ? (_jsx(DivisionCard, { div: div, navigate: navigate }, div.division)) : null) }))] }));
}
function DivisionCard({ div, navigate, }) {
    return (_jsxs(AppCard, { variant: "default", className: "mb-0 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-200/80 shadow-lg dark:border-blue-900 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-800/80", children: [_jsx("div", { className: "mb-4 flex items-center rounded-lg bg-blue-100 px-4 py-2 shadow-inner dark:bg-blue-900/60", children: _jsx("h2", { className: "text-2xl font-bold tracking-wide text-blue-700 dark:text-yellow-300 uppercase", children: divisionNamePretty(div.division) }) }), _jsx("div", { className: "rounded-xl bg-white/90 p-0 shadow-inner dark:bg-gray-950/60 overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/70", children: _jsxs("tr", { className: "text-center font-semibold text-blue-700 dark:text-blue-200", children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Team" }), _jsx("th", { children: "Pts" }), _jsx("th", { children: "Pl" }), _jsx("th", { children: "W" }), _jsx("th", { children: "D" }), _jsx("th", { children: "L" }), _jsx("th", { children: "GF" }), _jsx("th", { children: "GA" }), _jsx("th", { children: "GD" })] }) }), _jsx("tbody", { children: div.teams.map((team, idx) => (_jsxs("tr", { className: `transition-colors duration-100 ${idx % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-blue-100/60 dark:bg-blue-950/30'} hover:bg-yellow-100 dark:hover:bg-yellow-900/30`, children: [_jsx("td", { className: "px-3 py-2 text-left font-medium", children: _jsx("button", { className: "transition-colors text-blue-600 underline hover:text-yellow-700 dark:text-yellow-300 dark:hover:text-yellow-100", onClick: () => navigate(teamUrl(team.teamId)), children: team.name }) }), _jsx("td", { className: "text-center font-bold", children: team.points }), _jsx("td", { className: "text-center", children: team.played }), _jsx("td", { className: "text-center", children: team.won }), _jsx("td", { className: "text-center", children: team.draw }), _jsx("td", { className: "text-center", children: team.lost }), _jsx("td", { className: "text-center", children: team.goalsFor }), _jsx("td", { className: "text-center", children: team.goalsAgainst }), _jsx("td", { className: "text-center", children: team.goalDifference })] }, team.teamId))) })] }) })] }));
}
function divisionNamePretty(division) {
    switch (division) {
        case "D1": return "Division 1";
        case "D2": return "Division 2";
        case "D3": return "Division 3";
        case "D4": return "Division 4";
        default: return division;
    }
}
//# sourceMappingURL=StandingsPage.js.map