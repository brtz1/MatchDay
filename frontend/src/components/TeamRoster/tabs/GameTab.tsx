import { useEffect, useState } from 'react';
import { getNextMatch } from '../../../services/team';

interface Match {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  referee?: { name: string };
  matchday?: { number: number; type: string };
  matchDate: string;
}

interface Props {
  teamName: string;
  budget: number;
  morale: number | null;
}

export default function GameTab({ teamName, budget, morale }: Props) {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    getNextMatch(1).then(setMatch);
  }, []);

  if (!match) return <p>Loading next match...</p>;

  const opponent =
    match.homeTeam.name === teamName
      ? match.awayTeam.name
      : match.homeTeam.name;

  return (
    <div>
      <p className="font-bold text-accent mb-2">Next Match</p>
      <p>vs. {opponent}</p>
      <p>Referee: {match.referee?.name ?? "Unknown"}</p>
      <p>Matchday: {match.matchday?.number} ({match.matchday?.type})</p>
      <p>Kickoff: {new Date(match.matchDate).toLocaleDateString()}</p>
      <hr className="my-2" />
      <p>Budget: €{budget.toLocaleString()}</p>
      <p>Coach Morale: {morale !== null ? `${morale}%` : "N/A"}</p>
    </div>
  );
}
