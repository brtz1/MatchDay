import { useEffect, useState } from "react";
import { getNextMatch } from "@/services/teamService";
import { useGameState } from "@/store/GameStateStore";

interface MatchLite {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  refereeName?: string;
  matchdayNumber?: number;
  matchdayType?: "LEAGUE" | "CUP";
}

interface GameTabProps {
  teamId: number;
  teamName: string;
  morale: number | null;
}

export default function GameTab({ teamId, teamName, morale }: GameTabProps) {
  const [match, setMatch] = useState<MatchLite | null>(null);
  const { gameStage, matchdayType } = useGameState();

  useEffect(() => {
    if (gameStage === "ACTION") {
      getNextMatch(teamId)
        .then(setMatch)
        .catch((err: unknown) => {
          console.error("Failed to load next match:", err);
        });
    }
  }, [teamId, gameStage]);

  if (gameStage !== "ACTION") {
    return (
      <div>
        <p className="mb-2 font-bold text-accent">Matchday In Progress</p>
        <p>The match is currently being simulated.</p>
      </div>
    );
  }

  if (!match) return <p>Loading next match...</p>;

  const kickoff = new Date(match.matchDate).toLocaleDateString();

  return (
    <div>
      <p className="mb-2 font-bold text-accent">Next Match</p>
      <p>Match ID: {match.id}</p>
      <p>Home Team ID: {match.homeTeamId}</p>
      <p>Away Team ID: {match.awayTeamId}</p>
      <p>Referee: {match.refereeName ?? "Unknown"}</p>
      <p>
        Matchday:{" "}
        {match.matchdayNumber
          ? `${match.matchdayNumber} (${match.matchdayType})`
          : "TBD"}
      </p>
      <p>Kickoff: {kickoff}</p>

      <hr className="my-2" />

      <p>Coach Morale: {morale !== null ? `${morale}%` : "N/A"}</p>
    </div>
  );
}
