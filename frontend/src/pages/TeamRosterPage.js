import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, matchPath } from "react-router-dom";
import { matchdayUrl } from "@/utils/paths";
/* ── Services / store ─────────────────────────────────────────────── */
import { getTeamById } from "@/services/teamService";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";
/* ── UI ───────────────────────────────────────────────────────────── */
import TopNavBar from "@/components/common/TopNavBar";
import PlayerRoster from "@/components/TeamRoster/PlayerRoster";
import TeamRosterTabs from "@/components/TeamRoster/TeamRosterTabs";
import FormationTab from "@/components/TeamRoster/tabs/FormationTab"; // ← default export (uses GameState store internally)
import PlayerTab from "@/components/TeamRoster/tabs/PlayerTab";
import { ProgressBar } from "@/components/common/ProgressBar";
import GameTab from "@/components/TeamRoster/tabs/GameTab"; // ✅ canonical lowercase path
import { isAxiosError } from "axios";
/** Normalize division value to a friendly label ("1".."4", "Distrital", or "—") */
function formatDivision(div) {
    if (div === null || div === undefined)
        return "—";
    if (typeof div === "number")
        return String(div);
    const s = String(div).trim().toUpperCase();
    // Handle Distrital explicitly
    if (s.includes("DIST"))
        return "Distrital";
    // Try to extract a digit (covers "D1", "DIV_1", "DIVISION_4", etc.)
    const m = s.match(/(\d+)/);
    if (m)
        return m[1];
    // Fallback to raw string if nothing matched
    return s || "—";
}
export default function TeamRosterPage() {
    const { teamId: teamIdParam } = useParams();
    const { currentTeamId } = useTeamContext();
    // Grab the whole GameState API once so we can use optional actions without TS complaining
    const gameState = useGameState();
    const { coachTeamId, saveGameId, bootstrapping, 
    // NEW: react to MATCHDAY to jump to Live immediately
    gameStage, 
    // grace/timer flags from GameState store
    cameFromResults, clearCameFromResults, refreshGameState, 
    // selection store (used for legend only; PlayerRoster reads the store internally)
    lineupIds, } = gameState;
    const navigate = useNavigate();
    const location = useLocation();
    const urlTeamId = teamIdParam ? Number(teamIdParam) : null;
    const coachedId = coachTeamId ?? currentTeamId ?? null;
    const teamId = urlTeamId && urlTeamId > 0 ? urlTeamId : coachedId;
    const [team, setTeam] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const isCoachTeam = teamId === coachedId;
    const isTeamRosterPage = !!matchPath("/team/:id", location.pathname) || !!matchPath("/teams/:id", location.pathname);
    /* ---------------------------------------------------------------------------
       After RESULTS → STANDINGS → back here, refresh GameState so currentMatchday
       is advanced (backend increments during finalize flow).
    --------------------------------------------------------------------------- */
    useEffect(() => {
        if (!cameFromResults)
            return;
        (async () => {
            try {
                await refreshGameState();
            }
            finally {
                // Reset the one-shot flag so toolbar visits to Standings won't auto-refresh here.
                clearCameFromResults();
            }
        })();
    }, [cameFromResults, clearCameFromResults, refreshGameState]);
    /* ---------------------------------------------------------------------------
       NEW: Reset lineup/reserve *visual selection* when arriving from Results.
       Uses either:
         - store flag (cameFromResults), or
         - router state flag (location.state?.cameFromResults)
       Prefers store method `resetFormationSelection()` if present; falls back to
       `resetSelection()` (or manual lineup/reserve clears) and restores default formation.
       Also clears router state to avoid repeated resets.
    --------------------------------------------------------------------------- */
    useEffect(() => {
        const fromRouter = Boolean(location.state?.cameFromResults);
        const shouldReset = Boolean(cameFromResults || fromRouter);
        if (!shouldReset)
            return;
        try {
            if (typeof gameState.resetFormationSelection === "function") {
                gameState.resetFormationSelection();
            }
            else {
                if (typeof gameState.resetSelection === "function") {
                    gameState.resetSelection();
                }
                else {
                    if (typeof gameState.setLineupIds === "function")
                        gameState.setLineupIds([]);
                    if (typeof gameState.setReserveIds === "function")
                        gameState.setReserveIds([]);
                }
                if (typeof gameState.setSelectedFormation === "function") {
                    gameState.setSelectedFormation("4-4-2");
                }
            }
        }
        finally {
            if (fromRouter) {
                // Clear the router flag so a rerender doesn't trigger another reset
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameFromResults, location.state, navigate, location.pathname]);
    /* ---------------------------------------------------------------------------
       NEW: If the backend/socket flips stage to MATCHDAY, jump to Live instantly.
       (Prevents missing early minute ticks if user stayed on Formation/Game tabs.)
    --------------------------------------------------------------------------- */
    useEffect(() => {
        if (bootstrapping)
            return;
        if (gameStage === "MATCHDAY") {
            navigate(matchdayUrl);
        }
    }, [gameStage, bootstrapping, navigate]);
    useEffect(() => {
        if (!teamId || teamId <= 0) {
            console.warn("Invalid or missing team ID — redirecting to home");
            navigate("/", { replace: true });
            return;
        }
        if (bootstrapping || !saveGameId || !coachedId) {
            // GameState not ready yet
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
                    if (isAxiosError(err) && err.response?.status === 403) {
                        console.warn(`403 error loading team ${teamId}`);
                        break;
                    }
                    await new Promise((res) => setTimeout(res, 600));
                }
            }
            setLoading(false);
        };
        loadTeam();
    }, [teamId, navigate, saveGameId, coachedId, bootstrapping]);
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
    const divisionLabel = formatDivision(team.division);
    const coachLabel = (team.coachName?.trim() ?? "") || "—";
    return (_jsxs(_Fragment, { children: [isTeamRosterPage && _jsx(TopNavBar, { coachTeamId: coachedId }), _jsxs("div", { className: "min-h-screen space-y-4 bg-green-700 p-4 text-white pt-12", children: [_jsxs("div", { className: "flex items-center justify-between rounded p-2 shadow", style: { backgroundColor: primary, color: secondary }, children: [_jsx("h1", { className: "flex items-center gap-2 text-2xl font-bold", children: team.name }), _jsxs("p", { className: "text-xs", children: ["Division ", divisionLabel, "\u00A0|\u00A0 Coach ", coachLabel, " | Morale", " ", typeof team.morale === "number" ? team.morale : "—"] })] }), _jsxs("div", { className: "flex h-[60vh] gap-4", children: [_jsxs("div", { className: "w-[65%]", children: [_jsx(PlayerRoster, { players: team.players, selectedPlayer: selectedPlayer, onSelectPlayer: setSelectedPlayer }), _jsxs("div", { className: "mt-1 text-[11px] text-white/80", children: [_jsxs("span", { className: "mr-4", children: ["Legend: ", _jsx("span", { className: "font-bold text-white", children: "\u25EF" }), " Lineup \u00A0\u00A0", " ", _jsx("span", { className: "font-bold text-white", children: "\u2013" }), " Reserve"] }), _jsxs("span", { children: ["Selected starters: ", _jsx("span", { className: "font-semibold", children: lineupIds.length }), " / 11"] })] })] }), _jsx("div", { className: "w-[35%]", children: _jsxs(TeamRosterTabs, { tabs: tabs, children: [_jsx("div", { className: "space-y-2 text-sm", children: _jsx(GameTab, { teamId: team.id, teamName: team.name, morale: typeof team.morale === "number" ? team.morale : null }) }), isCoachTeam ? (_jsx(PlayerTab, { selectedPlayer: selectedPlayer, onRenewContract: () => { }, onSell: () => { } })) : (_jsx(PlayerTab, { selectedPlayer: selectedPlayer, renderActions: () => null })), isCoachTeam && _jsx(FormationTab, { players: team.players }), isCoachTeam && _jsx("div", { className: "text-sm", children: "Financial breakdown coming soon\u2026" })] }) })] })] })] }));
}
//# sourceMappingURL=TeamRosterPage.js.map
