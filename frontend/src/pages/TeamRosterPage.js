import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
/* ── Services / store ─────────────────────────────────────────────── */
import { getTeamById } from "@/services/teamService";
import { setFormation } from "@/services/matchService";
import { useTeamContext } from "@/store/TeamContext";
import axios from "axios";
/* ── UI ───────────────────────────────────────────────────────────── */
import TeamRosterToolbar from "@/components/TeamRoster/TeamRosterToolbar";
import PlayerRoster from "@/components/TeamRoster/PlayerRoster";
import TeamRosterTabs from "@/components/TeamRoster/TeamRosterTabs";
import FormationTab from "@/components/TeamRoster/tabs/FormationTab";
import { ProgressBar } from "@/components/common/ProgressBar";
export default function TeamRosterPage() {
    const { teamId: teamIdParam } = useParams();
    const { currentTeamId, currentSaveGameId, currentMatchdayId } = useTeamContext();
    const navigate = useNavigate();
    const numericId = teamIdParam ? Number(teamIdParam) : NaN;
    const teamId = !Number.isNaN(numericId) ? numericId : currentTeamId;
    const [team, setTeam] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [lineupIds, setLineupIds] = useState([]);
    const [benchIds, setBenchIds] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!teamId) {
            navigate("/", { replace: true });
            return;
        }
        const loadTeam = async (retries = 3) => {
            setLoading(true);
            for (let i = 0; i < retries; i++) {
                try {
                    const data = await getTeamById(teamId);
                    if (!data?.players?.length)
                        throw new Error("Players not ready");
                    setTeam({
                        ...data,
                        morale: data.morale ?? 50,
                    });
                    break;
                }
                catch {
                    await new Promise((res) => setTimeout(res, 600));
                }
            }
            setLoading(false);
        };
        loadTeam();
    }, [teamId, navigate]);
    const handleFormationSet = async (formation) => {
        try {
            if (!teamId || !currentSaveGameId || !currentMatchdayId) {
                throw new Error("Missing required context data");
            }
            // Fetch match info: matchId and whether this team is home
            const response = await axios.get("/api/matchdays/team-match-info", {
                params: {
                    saveGameId: currentSaveGameId,
                    matchday: currentMatchdayId,
                    teamId: teamId,
                },
            });
            const { matchId, isHomeTeam } = response.data;
            const result = await setFormation(matchId, teamId, formation, isHomeTeam);
            setLineupIds(result.lineup);
            setBenchIds(result.bench);
        }
        catch (err) {
            console.error("Failed to set formation:", err);
        }
    };
    if (!teamId) {
        return (_jsx("p", { className: "mt-6 text-center text-red-500", children: "No valid team ID \u2013 please start a new game." }));
    }
    if (loading || !team) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-700", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    const primary = team.colors?.primary ?? "#facc15";
    const secondary = team.colors?.secondary ?? "#000000";
    const tabs = [
        { value: "overview", label: "Game" },
        { value: "player", label: "Player" },
        { value: "formation", label: "Formation" },
        { value: "finances", label: "Finances" },
    ];
    return (_jsxs("div", { className: "min-h-screen space-y-4 bg-green-700 p-4 text-white", children: [_jsxs("div", { className: "flex items-center justify-between rounded p-2 shadow", style: { backgroundColor: primary, color: secondary }, children: [_jsx("h1", { className: "flex items-center gap-2 text-2xl font-bold", children: team.name }), _jsxs("p", { className: "text-xs", children: ["Division ", typeof team.division === "number" ? team.division : "—", "\u00A0|\u00A0 Coach ", team.coachName ?? "You", "\u00A0|\u00A0 Morale ", typeof team.morale === "number" ? team.morale : "—"] })] }), _jsx(TeamRosterToolbar, {}), _jsxs("div", { className: "flex h-[60vh] gap-4", children: [_jsx("div", { className: "w-[65%]", children: _jsx(PlayerRoster, { players: team.players, selectedPlayer: selectedPlayer, onSelectPlayer: setSelectedPlayer, lineupIds: lineupIds, benchIds: benchIds }) }), _jsx("div", { className: "w-[35%]", children: _jsxs(TeamRosterTabs, { tabs: tabs, children: [_jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("p", { children: ["Stadium: ", _jsx("span", { className: "font-semibold", children: team.stadiumCapacity ?? "—" })] }), _jsx("p", { children: "Next-fixture & morale widgets coming soon\u2026" })] }), _jsx("div", { className: "text-sm", children: selectedPlayer ? (_jsxs("ul", { className: "space-y-1", children: [_jsxs("li", { children: ["Rating: ", _jsx("strong", { children: selectedPlayer.rating })] }), _jsxs("li", { children: ["Salary: ", _jsxs("strong", { children: ["\u20AC", selectedPlayer.salary.toLocaleString()] })] }), _jsxs("li", { children: ["Nationality: ", selectedPlayer.nationality] })] })) : (_jsx("p", { children: "Select a player to view details." })) }), _jsx(FormationTab, { onSetFormation: handleFormationSet }), _jsx("div", { className: "text-sm", children: "Financial breakdown coming soon\u2026" })] }) })] })] }));
}
//# sourceMappingURL=TeamRosterPage.js.map