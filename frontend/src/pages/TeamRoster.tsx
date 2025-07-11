// src/pages/TeamRoster.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TeamRosterToolbar from "../components/TeamRoster/Toolbar";
import PlayerRoster from "../components/TeamRoster/PlayerRoster";
import TeamRosterTabs from "../components/TeamRoster/TeamRosterTabs";
import { getFlagUrl } from "../utils/getFlagUrl";
import { getTeamById } from "../services/teamService";
import { Player, Team as TeamType } from "../types";
import { useTeamContext } from "../context/TeamContext";

export default function TeamRoster() {
  const { teamId: rawId } = useParams<{ teamId?: string }>();
  const navigate = useNavigate();
  const { currentTeamId } = useTeamContext();

  // Parse URL param or fallback to context ID
  const urlNum = rawId ? Number(rawId) : NaN;
  const fallbackNum = currentTeamId;
  const teamId = !Number.isNaN(urlNum) ? urlNum : fallbackNum;

  const [team, setTeam] = useState<TeamType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!teamId) {
      console.warn("🚫 No team ID, redirecting home");
      navigate("/", { replace: true });
      return;
    }
    const id = teamId; // now definitely a number

    async function fetchTeamData(retries = 3) {
      console.log("🔍 fetching team", id);
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const data = await getTeamById(id);
          const players = data?.players;
          if (!data || !players || players.length === 0) {
            throw new Error("team data not ready");
          }
          console.log("✅ team loaded", data);
          setTeam({ ...data, players }); // assert players is defined
          return;
        } catch (err) {
          console.warn(`⚠️ attempt ${attempt} failed`, err);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      console.error("❌ failed to load team after retries");
    }

    fetchTeamData();
  }, [teamId, navigate]);

  // still no valid teamId
  if (!teamId) {
    return (
      <p className="text-center mt-4 text-red-500">
        No valid team ID. Start a new game.
      </p>
    );
  }
  const players = team?.players ?? [];
  
  // waiting on data
  if (!team) {
    return (
      <p className="text-center mt-4 text-yellow-400">
        Loading roster for team {teamId}…
      </p>
    );
  }

  // now we know team and team.players are defined
  const country = team.country ?? "";

  return (
    <div className="min-h-screen bg-green-700 text-white p-4 space-y-4">
      <div
        className="rounded shadow p-2 flex justify-between items-center"
        style={{
          backgroundColor: team.primaryColor ?? "#facc15",
          color: team.secondaryColor ?? "#000000",
        }}
      >
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {team.name}
          <img
            src={getFlagUrl(country)}
            alt={country}
            className="w-6 h-4"
          />
        </h1>
        <p className="text-xs text-black text-right">
          Division: {team.division ?? "Unknown"} |{" "}
          Coach: {team.coach?.name ?? "You"} |{" "}
          Morale: {team.coach?.morale ?? "n/a"}
        </p>
      </div>

      <TeamRosterToolbar />

      <div className="flex gap-4 h-[57vh]">
        <div className="w-[65%] h-full">
          <PlayerRoster
            players={players}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={setSelectedPlayer}
          />
        </div>
        <div className="w-[35%] h-full overflow-y-auto">
          <TeamRosterTabs
            team={team}
            players={players}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={setSelectedPlayer} finances={[]}          />
        </div>
      </div>
    </div>
  );
}
