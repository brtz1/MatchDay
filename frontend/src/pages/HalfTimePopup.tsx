import { useEffect, useState } from 'react';
import axios from 'axios';

interface MatchEvent {
  playerId: number;
  eventType: 'GOAL' | 'INJURY' | 'RED_CARD' | string;
}

interface MatchPlayer {
  id: number;
  name: string;
  position: string;
}

interface MatchState {
  homeLineup: number[];
  homeReserves: number[];
  homePlayers: MatchPlayer[];
  events: MatchEvent[];
}

interface HalfTimePopupProps {
  matchId: number;
  onClose: () => void;
}

export default function HalfTimePopup({ matchId, onClose }: HalfTimePopupProps) {
  const [data, setData] = useState<MatchState | null>(null);
  const [selectedOut, setSelectedOut] = useState<number | null>(null);
  const [selectedIn, setSelectedIn] = useState<number | null>(null);

  useEffect(() => {
    axios.get(`/api/match-state/${matchId}`).then((res) => {
      setData(res.data);
    });
  }, [matchId]);

  function playerLabel(pid: number): JSX.Element {
    const player = data?.homePlayers.find((p) => p.id === pid);
    const event = data?.events.find((e) => e.playerId === pid);

    const highlight =
      event?.eventType === 'INJURY'
        ? 'bg-orange-300'
        : event?.eventType === 'RED_CARD'
        ? 'bg-red-500 text-white'
        : 'bg-gray-200';

    return (
      <span className={`px-2 py-1 rounded ${highlight}`}>
        {player?.name ?? `#${pid}`} ({player?.position ?? '?'})
      </span>
    );
  }

  async function makeSub() {
    if (!selectedOut || !selectedIn) return;
    try {
      await axios.post('/api/substitute', {
        matchId,
        team: 'home',
        outPlayerId: selectedOut,
        inPlayerId: selectedIn,
      });
      await axios.post('/api/resume-match', { matchId });
      onClose();
    } catch (err) {
      console.error(err);
    }
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded p-6 w-[600px] max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-xl font-bold mb-4">Half-Time Substitutions</h2>

        <h3 className="font-semibold mt-2 mb-1">Current Lineup</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {data.homeLineup.map((pid) => (
            <button
              key={pid}
              onClick={() => setSelectedOut(pid)}
              className={`border px-2 py-1 rounded ${
                selectedOut === pid ? 'bg-blue-300' : ''
              }`}
            >
              {playerLabel(pid)}
            </button>
          ))}
        </div>

        <h3 className="font-semibold mt-2 mb-1">Reserves</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {data.homeReserves.map((pid) => (
            <button
              key={pid}
              onClick={() => setSelectedIn(pid)}
              className={`border px-2 py-1 rounded ${
                selectedIn === pid ? 'bg-green-300' : ''
              }`}
            >
              {playerLabel(pid)}
            </button>
          ))}
        </div>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
          onClick={makeSub}
        >
          Confirm Sub & Resume Match
        </button>

        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
