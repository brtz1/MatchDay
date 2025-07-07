import { useEffect, useState } from "react";
import TeamRosterToolbar from "../components/TeamRoster/Toolbar";
import PlayerRoster from "../components/TeamRoster/PlayerRoster";
import TeamRosterTabs from "../components/TeamRoster/TeamRosterTabs";
import { getFlagEmoji } from "../utils/getFlagEmoji";
import { getFlagUrl } from "../utils/getFlagUrl";

interface Team {
  id: number;
  name: string;
  country: string;
  budget: number;
  division?: {
    id: number;
    name: string;
    level: number;
  };
  primaryColor?: string;
  secondaryColor?: string;
  coach?: {
    id: number;
    name: string;
    morale?: number;
    level?: string;
  };
}

export default function TeamRoster() {
  const [team, setTeam] = useState<Team | null>(null);

  const teamId = 1;

  useEffect(() => {
    if (!teamId) {
      console.warn("No team ID provided");
      return;
    }

    fetch(`http://localhost:4000/api/teams/${teamId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Team ${teamId} not found (status ${res.status})`);
        return res.json();
      })
      .then((data) => {
        console.log("Fetched team data:", data);
        setTeam(data);
      })
      .catch((err) => console.error(err));
  }, [teamId]);

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
          Division: {team.division?.name ?? "Unknown"}
          {" | "}
          Coach: {team.coach?.name ?? "Unknown"}
          {team.coach?.level ? ` (Level: ${team.coach.level})` : ""}
          {" | "}
          Morale: {team.coach?.morale ?? "n/a"}
          {" | "}
          Budget: €{team.budget.toLocaleString()}
        </p>
      </div>

      <TeamRosterToolbar />

      <div className="flex gap-4 h-[57vh]">
        {/* Player roster 70% */}
        <div className="w-[65%] h-full">
          <PlayerRoster />
        </div>
        {/* Tabs 30% */}
        <div className="w-[35%] h-[full overflow-y-auto]">
          <TeamRosterTabs
            teamName={team.name}
            budget={team.budget}
            morale={team.coach?.morale ?? null}
          />
        </div>
      </div>
    </div>
  );
}
