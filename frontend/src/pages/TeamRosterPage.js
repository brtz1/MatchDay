import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, matchPath } from "react-router-dom";
/* ── Services / store ─────────────────────────────────────────────── */
import { getTeamById } from "@/services/teamService";
import { setFormation } from "@/services/matchService";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";
import axios from "axios";
/* ── UI ───────────────────────────────────────────────────────────── */
import TopNavBar from "@/components/common/TopNavBar";
import PlayerRoster from "@/components/TeamRoster/PlayerRoster";
import TeamRosterTabs from "@/components/TeamRoster/TeamRosterTabs";
import FormationTab from "@/components/TeamRoster/tabs/FormationTab";
import PlayerTab from "@/components/TeamRoster/tabs/PlayerTab";
import { ProgressBar } from "@/components/common/ProgressBar";
export default function TeamRosterPage() {
    const { teamId: teamIdParam } = useParams();
    const { currentTeamId } = useTeamContext();
    const { coachTeamId, saveGameId, currentMatchday, bootstrapping, } = useGameState();
    const navigate = useNavigate();
    const location = useLocation();
    const coachedId = coachTeamId ?? currentTeamId ?? 0;
    const paramId = teamIdParam ? Number(teamIdParam) : NaN;
    const teamId = !Number.isNaN(paramId) && paramId > 0 ? paramId : coachedId;
    const [team, setTeam] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [lineupIds, setLineupIds] = useState([]);
    const [benchIds, setBenchIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const isCoachTeam = teamId === coachedId;
    const isTeamRosterPage = !!matchPath("/team/:id", location.pathname) || !!matchPath("/teams/:id", location.pathname);
    useEffect(() => {
        if (!teamId || isNaN(Number(teamId)) || Number(teamId) <= 0) {
            console.warn("Invalid or missing team ID — redirecting to home");
            navigate("/", { replace: true });
            return;
        }
        if (bootstrapping || !saveGameId || !coachedId) {
            console.warn("GameState not ready — skipping load");
            return;
        }
        const loadTeam = async (retries = 3) => {
            setLoading(true);
            for (let i = 0; i < retries; i++) {
                try {
                    const data = await getTeamById(teamId, coachedId);
                    if (!data?.players?.length) {
                        console.warn(`Team ${teamId} has no players yet (retrying)`);
                        throw new Error("Players not ready");
                    }
                    setTeam({
                        ...data,
                        morale: data.morale ?? 50,
                    });
                    break;
                }
                catch (err) {
                    if (err?.response?.status === 403) {
                        console.warn(`403 error loading team ${teamId}`);
                        break;
                    }
                    await new Promise((res) => setTimeout(res, 600));
                }
            }
            setLoading(false);
        };
        if (location.state?.fromResults && saveGameId) {
            axios
                .post("/api/matchdays/advance", { saveGameId })
                .catch((err) => console.error("Failed to advance matchday", err));
        }
        loadTeam();
    }, [teamId, navigate, location.state, saveGameId, coachedId]);
    const handleFormationSet = async (formation) => {
        try {
            if (!teamId || !saveGameId || currentMatchday == null) {
                throw new Error("Missing required context data");
            }
            const response = await axios.get("/api/matchdays/team-match-info", {
                params: {
                    saveGameId,
                    matchday: currentMatchday,
                    teamId,
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
    const handleRenewContract = (player) => {
        alert(`Renew contract for ${player.name} (not implemented)`);
    };
    const handleSell = (player) => {
        alert(`Sell player ${player.name} (not implemented)`);
    };
    const handleBuyPlayer = (player) => {
        alert(`Buy player ${player.name} (API integration pending)`);
    };
    const handleScoutPlayer = (player) => {
        alert(`Scout player ${player.name} (not implemented yet)`);
    };
    const handleLoanPlayer = (player) => {
        alert(`Loan player ${player.name} (not implemented yet)`);
    };
    const tabs = isCoachTeam
        ? [
            { value: "overview", label: "Game" },
            { value: "player", label: "Player" },
            { value: "formation", label: "Formation" },
            { value: "finances", label: "Finances" },
        ]
        : [
            { value: "overview", label: "Game" },
            { value: "player", label: "Player" },
        ];
    if (!teamId || !saveGameId || !coachedId) {
        return (_jsx("p", { className: "mt-6 text-center text-red-500", children: "Game not fully initialized \u2014 please start a new game." }));
    }
    if (loading || !team) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-700", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    const primary = team.colors?.primary ?? "#facc15";
    const secondary = team.colors?.secondary ?? "#000000";
    return (_jsxs(_Fragment, { children: [isTeamRosterPage && _jsx(TopNavBar, { coachTeamId: coachedId }), _jsxs("div", { className: "min-h-screen space-y-4 bg-green-700 p-4 text-white pt-12", children: [_jsxs("div", { className: "flex items-center justify-between rounded p-2 shadow", style: { backgroundColor: primary, color: secondary }, children: [_jsx("h1", { className: "flex items-center gap-2 text-2xl font-bold", children: team.name }), _jsxs("p", { className: "text-xs", children: ["Division ", typeof team.division === "number" ? team.division : "—", "\u00A0|\u00A0 Coach ", team.coachName ?? (isCoachTeam ? "You" : "—"), "\u00A0|\u00A0Morale", " ", typeof team.morale === "number" ? team.morale : "—"] })] }), _jsxs("div", { className: "flex h-[60vh] gap-4", children: [_jsx("div", { className: "w-[65%]", children: _jsx(PlayerRoster, { players: team.players, selectedPlayer: selectedPlayer, onSelectPlayer: setSelectedPlayer, lineupIds: lineupIds, benchIds: benchIds }) }), _jsx("div", { className: "w-[35%]", children: _jsxs(TeamRosterTabs, { tabs: tabs, children: [_jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("p", { children: ["Stadium: ", _jsx("span", { className: "font-semibold", children: team.stadiumCapacity ?? "—" })] }), _jsx("p", { children: "Next-fixture & morale widgets coming soon\u2026" })] }), isCoachTeam ? (_jsx(PlayerTab, { selectedPlayer: selectedPlayer, onRenewContract: handleRenewContract, onSell: handleSell })) : (_jsx(PlayerTab, { selectedPlayer: selectedPlayer, renderActions: (player) => (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-800", onClick: () => handleBuyPlayer(player), children: "Buy" }), _jsx("button", { className: "rounded bg-yellow-600 px-2 py-1 text-xs hover:bg-yellow-700", onClick: () => handleScoutPlayer(player), disabled: true, children: "Scout" }), _jsx("button", { className: "rounded bg-gray-600 px-2 py-1 text-xs hover:bg-gray-700", onClick: () => handleLoanPlayer(player), disabled: true, children: "Loan" })] })) })), isCoachTeam && _jsx(FormationTab, { onSetFormation: handleFormationSet }), isCoachTeam && _jsx("div", { className: "text-sm", children: "Financial breakdown coming soon\u2026" })] }) })] })] })] }));
}
//# sourceMappingURL=TeamRosterPage.js.map