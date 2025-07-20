import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import { teamUrl } from "@/utils/paths"; // ✅ central route helper
/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function StandingsPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        axios
            .get("/standings")
            .then(({ data }) => setData(data))
            .catch(() => setError("Failed to load standings"))
            .finally(() => setLoading(false));
    }, []);
    return (_jsxs("div", { className: "mx-auto flex max-w-4xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "League Standings" }), loading ? (_jsx(ProgressBar, { className: "w-64" })) : error ? (_jsx("p", { className: "text-red-500", children: error })) : (data.map((div) => (_jsxs(AppCard, { variant: "outline", className: "overflow-x-auto", children: [_jsx("h2", { className: "mb-2 text-xl font-semibold", children: div.division }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800", children: _jsxs("tr", { className: "text-center font-medium", children: [_jsx("th", { className: "px-2 text-left", children: "Team" }), _jsx("th", { children: "Pts" }), _jsx("th", { children: "Pl" }), _jsx("th", { children: "W" }), _jsx("th", { children: "D" }), _jsx("th", { children: "L" }), _jsx("th", { children: "GF" }), _jsx("th", { children: "GA" })] }) }), _jsx("tbody", { children: div.teams.map((team, idx) => (_jsxs("tr", { className: idx % 2 === 0
                                        ? "bg-white dark:bg-gray-900"
                                        : "bg-gray-50 dark:bg-gray-800/50", children: [_jsx("td", { className: "px-2 py-1 text-left font-medium", children: _jsx("button", { className: "text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200", onClick: () => navigate(teamUrl(team.id)), children: team.name }) }), _jsx("td", { className: "text-center", children: team.points }), _jsx("td", { className: "text-center", children: team.played }), _jsx("td", { className: "text-center", children: team.wins }), _jsx("td", { className: "text-center", children: team.draws }), _jsx("td", { className: "text-center", children: team.losses }), _jsx("td", { className: "text-center", children: team.goalsFor }), _jsx("td", { className: "text-center", children: team.goalsAgainst })] }, team.id))) })] })] }, div.division))))] }));
}
//# sourceMappingURL=StandingsPage.js.map