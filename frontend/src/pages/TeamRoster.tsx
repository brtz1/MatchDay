import { useEffect, useState } from "react";
import TeamRosterToolbar from "../components/TeamRoster/Toolbar";
import PlayerRoster from "../components/TeamRoster/PlayerRoster";
import TeamRosterTabs from "../components/TeamRoster/TeamRosterTabs";
import { getFlagUrl } from "../utils/getFlagUrl";
import { getTeamById, getPlayersByTeam, getTeamFinances } from "../services/teamService";
import { Player, Team, Finance } from "@/types";

export default function TeamRoster() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const teamId = 1;

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamData, playerData, financeData] = await Promise.all([
          getTeamById(teamId),
          getPlayersByTeam(teamId),
          getTeamFinances(teamId),
        ]);
        setTeam(teamData);
        setPlayers(playerData);
        setFinances(financeData);
      } catch (err) {
        console.error("Failed to load team data:", err);
      }
    }

    fetchData();
  }, []);

  if (!team) return <p className="text-center mt-4">Loading team roster...</p>;

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
            src={getFlagUrl(team.country)}
            alt={team.country}
            className="inline w-6 h-4"
          />
        </h1>
        <p className="text-xs text-black text-right">
          Division: {team.division?.name ?? "Unknown"}{" | "}
          Coach: {team.coach?.name ?? "Unknown"}
          {team.coach?.level ? ` (Level: ${team.coach.level})` : ""}
          {" | "}
          Morale: {team.coach?.morale ?? "n/a"}{" | "}
          Budget: €{team.budget.toLocaleString()}
        </p>
      </div>

      <TeamRosterToolbar />

      <div className="flex gap-4 h-[57vh]">
        {/* Player roster 70% */}
        <div className="w-[65%] h-full">
          <PlayerRoster
            players={players}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={setSelectedPlayer}
          />
        </div>

        {/* Tabs 30% */}
        <div className="w-[35%] h-full overflow-y-auto">
          <TeamRosterTabs
            team={team}
            players={players}
            finances={finances}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={setSelectedPlayer}
          />
        </div>
      </div>
    </div>
  );
}
