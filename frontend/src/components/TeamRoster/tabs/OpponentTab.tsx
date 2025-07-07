import { useEffect, useState } from 'react';
import { getNextMatch, getOpponentInfo } from '../../../services/team';

interface Opponent {
  id: number;
  name: string;
  coach?: { name: string; morale: number };
}

export default function OpponentTab() {
  const [opponent, setOpponent] = useState<Opponent | null>(null);

  useEffect(() => {
    // first load the next match
    getNextMatch(1).then(match => {
      if (!match) return;
      // get opponent ID
      const oppId = match.homeTeam.id === 1 ? match.awayTeam.id : match.homeTeam.id;
      getOpponentInfo(oppId).then(setOpponent);
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
