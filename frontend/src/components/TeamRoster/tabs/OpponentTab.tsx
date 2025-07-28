import { useEffect, useState } from 'react';
import { useGameState } from '@/store/GameStateStore';
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

export default function OpponentTab() {
  const { coachTeamId } = useGameState();
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    async function fetchOpponent() {
      if (!coachTeamId) {
        if (!canceled) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const match = await getNextMatch(coachTeamId);
        if (!match) {
          if (!canceled) setOpponent(null);
          return;
        }

        const opponentId =
          match.homeTeamId === coachTeamId
            ? match.awayTeamId
            : match.homeTeamId;

        const opp = await getOpponentInfo(opponentId);
        if (!canceled) setOpponent(opp);
      } catch (err) {
        console.error('Failed to load opponent:', err);
        if (!canceled) setError('Failed to load opponent');
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    fetchOpponent();
    return () => { canceled = true; };
  }, [coachTeamId]);

  if (loading) return <p>Loading opponent...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!opponent) return <p>No upcoming match.</p>;

  return (
    <div>
      <p className="font-bold text-accent mb-2">Opponent</p>
      <p>Team: {opponent.name}</p>
      <p>Coach: {opponent.coach?.name ?? 'N/A'}</p>
      <p>
        Morale:{' '}
        {opponent.coach?.morale != null
          ? `${opponent.coach.morale}%`
          : 'Unknown'}
      </p>
      <button className="bg-primary text-black rounded px-2 py-1 mt-2">
        View Fixtures
      </button>
      <button className="bg-primary text-black rounded px-2 py-1 mt-2 ml-2">
        View Roster
      </button>
    </div>
  );
}
