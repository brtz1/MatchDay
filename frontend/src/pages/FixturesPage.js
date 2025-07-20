import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { useTeamContext } from "@/store/TeamContext";
import { teamUrl } from "@/utils/paths";
/* ── Component ───────────────────────── */
export default function FixturesPage() {
    const navigate = useNavigate();
    const { currentTeamId } = useTeamContext();
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function fetchFixtures() {
            setLoading(true);
            try {
                const { data } = await axios.get("/matches/all");
                const grouped = groupFixturesByMatchday(data);
                setFixtures(grouped);
            }
            catch {
                setError("Failed to load fixtures.");
            }
            finally {
                setLoading(false);
            }
        }
        fetchFixtures();
    }, []);
    function groupFixturesByMatchday(matches) {
        const map = new Map();
        for (const match of matches) {
            const key = `${match.matchdayType}-${match.matchday}`;
            if (!map.has(key)) {
                map.set(key, {
                    matchday: match.matchday,
                    matchdayType: match.matchdayType,
                    matches: [],
                });
            }
            map.get(key).matches.push(match);
        }
        return Array.from(map.values()).sort((a, b) => a.matchday - b.matchday);
    }
    function formatScore(match) {
        return match.isPlayed
            ? `${match.homeGoals} - ${match.awayGoals}`
            : "vs";
    }
    function formatMatchdayLabel(group) {
        if (group.matchdayType === "LEAGUE") {
            return `League Matchday ${group.matchday}`;
        }
        const labels = [
            "Round of 128", "Round of 64", "Round of 32", "Round of 16",
            "Quarterfinal", "Semifinal", "Final"
        ];
        return labels[group.matchday - 1] || `Cup Matchday ${group.matchday}`;
    }
    function handleTeamClick(teamId) {
        navigate(teamUrl(teamId));
    }
    return (_jsxs("div", { className: "mx-auto max-w-5xl p-6 space-y-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Fixtures" }), loading ? (_jsx(ProgressBar, {})) : error ? (_jsx("p", { className: "text-red-500", children: error })) : fixtures.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "No fixtures available." })) : (fixtures.map((group) => (_jsxs(AppCard, { children: [_jsx("h2", { className: "text-xl font-bold mb-2", children: formatMatchdayLabel(group) }), _jsx("ul", { className: "divide-y divide-gray-200 dark:divide-gray-700", children: group.matches.map((match) => (_jsxs("li", { className: "flex items-center justify-between py-2", children: [_jsx("span", { className: "cursor-pointer hover:underline text-blue-600 dark:text-blue-300", onClick: () => handleTeamClick(match.homeTeam.id), children: match.homeTeam.name }), _jsx("span", { className: "text-gray-600 dark:text-gray-300 font-semibold", children: formatScore(match) }), _jsx("span", { className: "cursor-pointer hover:underline text-blue-600 dark:text-blue-300", onClick: () => handleTeamClick(match.awayTeam.id), children: match.awayTeam.name })] }, match.id))) })] }, `${group.matchdayType}-${group.matchday}`)))), _jsx("div", { className: "pt-4", children: _jsx(AppButton, { variant: "secondary", onClick: () => navigate(teamUrl(currentTeamId ?? 1)), children: "Back to My Team" }) })] }));
}
//# sourceMappingURL=FixturesPage.js.map