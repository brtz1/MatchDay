import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TeamRosterToolbar from "../components/TeamRoster/Toolbar";
import PlayerRoster from "../components/TeamRoster/PlayerRoster";
import TeamRosterTabs from "../components/TeamRoster/TeamRosterTabs";
import { getFlagUrl } from "../utils/getFlagUrl";
import { getTeamById, getPlayersByTeam, getTeamFinances } from "../services/teamService";
export default function TeamRoster() {
    const { id } = useParams();
    const teamId = Number(id);
    const [team, setTeam] = useState(null);
    const [players, setPlayers] = useState([]);
    const [finances, setFinances] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    useEffect(() => {
        async function fetchData() {
            try {
                const [teamData, playerData, financeData] = await Promise.all([
                    getTeamById(teamId),
                    getPlayersByTeam(teamId),
                    getTeamFinances(teamId),
                ]);
                console.log("🏟️ Team:", teamData);
                console.log("👥 Players:", playerData);
                console.log("💰 Finance:", financeData);
                setTeam(teamData);
                setPlayers(playerData);
                setFinances([financeData]);
            }
            catch (err) {
                console.error("Failed to load team data:", err);
            }
        }
        if (!isNaN(teamId)) {
            fetchData();
        }
    }, [teamId]);
    if (!team)
        return _jsx("p", { className: "text-center mt-4", children: "Loading team roster..." });
    return (_jsxs("div", { className: "min-h-screen bg-green-700 text-white p-4 space-y-4", children: [_jsxs("div", { className: "rounded shadow p-2 flex justify-between items-center", style: {
                    backgroundColor: team.primaryColor ?? "#facc15",
                    color: team.secondaryColor ?? "#000000",
                }, children: [_jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [team.name, _jsx("img", { src: getFlagUrl(team.country), alt: team.country, className: "inline w-6 h-4" })] }), _jsxs("p", { className: "text-xs text-black text-right", children: ["Division: ", team.division?.name ?? "Unknown", " | ", "Coach: ", team.coach?.name ?? "Unknown", team.coach?.level ? ` (Level: ${team.coach.level})` : "", " | ", "Morale: ", team.coach?.morale ?? "n/a", " | ", "Budget: \u20AC", team.budget?.toLocaleString?.() ?? "n/a"] })] }), _jsx(TeamRosterToolbar, {}), _jsxs("div", { className: "flex gap-4 h-[57vh]", children: [_jsx("div", { className: "w-[65%] h-full", children: _jsx(PlayerRoster, { players: players, selectedPlayer: selectedPlayer, onSelectPlayer: setSelectedPlayer }) }), _jsx("div", { className: "w-[35%] h-full overflow-y-auto", children: _jsx(TeamRosterTabs, { team: team, players: players, finances: finances, selectedPlayer: selectedPlayer, onSelectPlayer: setSelectedPlayer }) })] })] }));
}
//# sourceMappingURL=TeamRoster.js.map