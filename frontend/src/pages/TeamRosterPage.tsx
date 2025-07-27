// frontend/src/pages/TeamRosterPage.tsx

import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, matchPath } from "react-router-dom";

/* ── Services / store ─────────────────────────────────────────────── */
import { getTeamById } from "@/services/teamService";
import { setFormation } from "@/services/matchService";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";
import api from "../services/axios";

/* ── UI ───────────────────────────────────────────────────────────── */
import TopNavBar from "@/components/common/TopNavBar";
import PlayerRoster from "@/components/TeamRoster/PlayerRoster";
import TeamRosterTabs, { TabDefinition } from "@/components/TeamRoster/TeamRosterTabs";
import FormationTab from "@/components/TeamRoster/tabs/FormationTab";
import PlayerTab from "@/components/TeamRoster/tabs/PlayerTab";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ── Types ────────────────────────────────────────────────────────── */
import type { Backend } from "@/types/backend";
type Player = Backend.Player;

type Team = {
  id: number;
  name: string;
  colors?: { primary: string; secondary: string };
  stadiumCapacity?: number;
  division?: number;
  morale?: number;
  coachName?: string;
  players: Player[];
};

export default function TeamRosterPage() {
  const { teamId: teamIdParam } = useParams<{ teamId?: string }>();
  const { currentTeamId } = useTeamContext();
  const {
    coachTeamId,
    saveGameId,
    currentMatchday,
    bootstrapping,
  } = useGameState();

  const navigate = useNavigate();
  const location = useLocation();

  const urlTeamId = teamIdParam ? Number(teamIdParam) : null;
  const coachedId = coachTeamId ?? currentTeamId ?? null;
  const teamId = urlTeamId && urlTeamId > 0 ? urlTeamId : coachedId;

  const [team, setTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [lineupIds, setLineupIds] = useState<number[]>([]);
  const [benchIds, setBenchIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const isCoachTeam = teamId === coachedId;
  const isTeamRosterPage =
    !!matchPath("/team/:id", location.pathname) || !!matchPath("/teams/:id", location.pathname);

  useEffect(() => {
    if (!teamId || teamId <= 0) {
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
        } catch (err: any) {
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
      api
        .post("/matchdays/advance", { saveGameId })
        .catch((err) => console.error("Failed to advance matchday", err));
    }

    loadTeam();
  }, [teamId, navigate, location.state, saveGameId, coachedId]);

  const handleFormationSet = async (formation: string) => {
    try {
      if (!teamId || !saveGameId || currentMatchday == null) {
        throw new Error("Missing required context data");
      }

      const response = await api.get("/matchdays/team-match-info", {
        params: {
          saveGameId,
          matchday: currentMatchday,
          teamId,
        },
    });

      console.log("📦 team-match-info response:", response.data); // 🔍 Added logging here

      const { matchId, isHomeTeam } = response.data;

      if (!matchId) {
        throw new Error("❌ Could not retrieve valid matchId for team formation");
      }

      console.log("✅ Setting formation for", { matchId, teamId, formation, isHomeTeam });

      const result = await setFormation(matchId, teamId, formation, isHomeTeam);
      setLineupIds(result.lineup);
      setBenchIds(result.bench);
    } catch (err) {
      console.error("Failed to set formation:", err);
    }
  };

  const handleRenewContract = (player: Player) => {
    alert(`Renew contract for ${player.name} (not implemented)`);
  };

  const handleSell = (player: Player) => {
    alert(`Sell player ${player.name} (not implemented)`);
  };

  const handleBuyPlayer = (player: Player) => {
    alert(`Buy player ${player.name} (API integration pending)`);
  };

  const handleScoutPlayer = (player: Player) => {
    alert(`Scout player ${player.name} (not implemented yet)`);
  };

  const handleLoanPlayer = (player: Player) => {
    alert(`Loan player ${player.name} (not implemented yet)`);
  };

  const tabs: TabDefinition[] = isCoachTeam
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
    return (
      <p className="mt-6 text-center text-red-500">
        Game not fully initialized — please start a new game.
      </p>
    );
  }

  if (loading || !team) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-700">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  const primary = team.colors?.primary ?? "#facc15";
  const secondary = team.colors?.secondary ?? "#000000";

  return (
    <>
      {isTeamRosterPage && <TopNavBar coachTeamId={coachedId ?? -1} />}

      <div className="min-h-screen space-y-4 bg-green-700 p-4 text-white pt-12">
        <div
          className="flex items-center justify-between rounded p-2 shadow"
          style={{ backgroundColor: primary, color: secondary }}
        >
          <h1 className="flex items-center gap-2 text-2xl font-bold">{team.name}</h1>
          <p className="text-xs">
            Division {typeof team.division === "number" ? team.division : "—"}&nbsp;|&nbsp;
            Coach {team.coachName ?? (isCoachTeam ? "You" : "—")}&nbsp;|&nbsp;Morale{" "}
            {typeof team.morale === "number" ? team.morale : "—"}
          </p>
        </div>

        <div className="flex h-[60vh] gap-4">
          <div className="w-[65%]">
            <PlayerRoster
              players={team.players}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={setSelectedPlayer}
              lineupIds={lineupIds}
              benchIds={benchIds}
            />
          </div>

          <div className="w-[35%]">
            <TeamRosterTabs tabs={tabs}>
              <div className="space-y-2 text-sm">
                <p>
                  Stadium: <span className="font-semibold">{team.stadiumCapacity ?? "—"}</span>
                </p>
                <p>Next-fixture &amp; morale widgets coming soon…</p>
              </div>

              {isCoachTeam ? (
                <PlayerTab
                  selectedPlayer={selectedPlayer}
                  onRenewContract={handleRenewContract}
                  onSell={handleSell}
                />
              ) : (
                <PlayerTab
                  selectedPlayer={selectedPlayer}
                  renderActions={(player: Player) => (
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-800"
                        onClick={() => handleBuyPlayer(player)}
                      >
                        Buy
                      </button>
                      <button
                        className="rounded bg-yellow-600 px-2 py-1 text-xs hover:bg-yellow-700"
                        onClick={() => handleScoutPlayer(player)}
                        disabled
                      >
                        Scout
                      </button>
                      <button
                        className="rounded bg-gray-600 px-2 py-1 text-xs hover:bg-gray-700"
                        onClick={() => handleLoanPlayer(player)}
                        disabled
                      >
                        Loan
                      </button>
                    </div>
                  )}
                />
              )}

              {isCoachTeam && <FormationTab onSetFormation={handleFormationSet} />}
              {isCoachTeam && <div className="text-sm">Financial breakdown coming soon…</div>}
            </TeamRosterTabs>
          </div>
        </div>
      </div>
    </>
  );
}
