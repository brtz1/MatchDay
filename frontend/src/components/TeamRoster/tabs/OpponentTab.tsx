import { useEffect, useState } from 'react';
import { getNextMatch, getOpponentInfo } from '@/services/teamService';

interface Opponent {
  id: number;
  name: string;
  coach?: { name: string; morale: number };
}

interface MatchLite {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  division?: string;
}

const COACH_TEAM_ID = 1;

export default function OpponentTab() {
  const [opponent, setOpponent] = useState<Opponent | null>(null);

  useEffect(() => {
    getNextMatch(COACH_TEAM_ID).then((match: MatchLite) => {
      if (!match) return;
      const opponentId =
        match.homeTeamId === COACH_TEAM_ID
          ? match.awayTeamId
          : match.homeTeamId;

      getOpponentInfo(opponentId).then(setOpponent);
    }).catch((err: unknown) => {
      console.error("Failed to load opponent:", err);
    });
  }, []);

  if (!opponent) return <p>Loading opponent...</p>;

  return (
    <div>
      <p className="font-bold text-accent mb-2">Opponent</p>
      <p>Team: {opponent.name}</p>
      <p>Coach: {opponent.coach?.name ?? "N/A"}</p>
      <p>Morale: {opponent.coach?.morale ?? "Unknown"}%</p>
      <button className="bg-primary text-black rounded px-2 py-1 mt-2">View Fixtures</button>
      <button className="bg-primary text-black rounded px-2 py-1 mt-2 ml-2">View Roster</button>
    </div>
  );
}
