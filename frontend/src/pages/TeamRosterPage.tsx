import * as React from "react";
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
import TeamRosterTabs, { TabDefinition } from "@/components/TeamRoster/TeamRosterTabs";
import FormationTab from "@/components/TeamRoster/tabs/FormationTab";
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
  const { currentTeamId, currentSaveGameId, currentMatchdayId } = useTeamContext();
  const navigate = useNavigate();

  const numericId = teamIdParam ? Number(teamIdParam) : NaN;
  const teamId = !Number.isNaN(numericId) ? numericId : currentTeamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [lineupIds, setLineupIds] = useState<number[]>([]);
  const [benchIds, setBenchIds] = useState<number[]>([]);
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
          if (!data?.players?.length) throw new Error("Players not ready");
          setTeam({
            ...data,
            morale: data.morale ?? 50,
          });
          break;
        } catch {
          await new Promise((res) => setTimeout(res, 600));
        }
      }
      setLoading(false);
    };

    loadTeam();
  }, [teamId, navigate]);

  const handleFormationSet = async (formation: string) => {
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
    } catch (err) {
      console.error("Failed to set formation:", err);
    }
  };

  if (!teamId) {
    return (
      <p className="mt-6 text-center text-red-500">
        No valid team ID – please start a new game.
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

  const tabs: TabDefinition[] = [
    { value: "overview", label: "Game" },
    { value: "player", label: "Player" },
    { value: "formation", label: "Formation" },
    { value: "finances", label: "Finances" },
  ];

  return (
    <div className="min-h-screen space-y-4 bg-green-700 p-4 text-white">
      <div
        className="flex items-center justify-between rounded p-2 shadow"
        style={{ backgroundColor: primary, color: secondary }}
      >
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {team.name}
        </h1>
        <p className="text-xs">
          Division {typeof team.division === "number" ? team.division : "—"}
          &nbsp;|&nbsp; Coach {team.coachName ?? "You"}
          &nbsp;|&nbsp; Morale {typeof team.morale === "number" ? team.morale : "—"}
        </p>
      </div>

      <TeamRosterToolbar />

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
              <p>Stadium: <span className="font-semibold">{team.stadiumCapacity ?? "—"}</span></p>
              <p>Next-fixture &amp; morale widgets coming soon…</p>
            </div>

            <div className="text-sm">
              {selectedPlayer ? (
                <ul className="space-y-1">
                  <li>Rating: <strong>{selectedPlayer.rating}</strong></li>
                  <li>Salary: <strong>€{selectedPlayer.salary.toLocaleString()}</strong></li>
                  <li>Nationality: {selectedPlayer.nationality}</li>
                </ul>
              ) : (
                <p>Select a player to view details.</p>
              )}
            </div>

            <FormationTab onSetFormation={handleFormationSet} />

            <div className="text-sm">Financial breakdown coming soon…</div>
          </TeamRosterTabs>
        </div>
      </div>
    </div>
  );
}
