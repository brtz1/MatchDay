import { useEffect, useState } from 'react';
import axios from 'axios';

interface MatchEvent {
  minute: number;
  type: string;
  desc: string;
}

interface MatchSummary {
  matchId: number;
  home: string;
  away: string;
  score: string;
  events: MatchEvent[];
}

export default function PostMatchSummary({ matchdayId }: { matchdayId: number }) {
  const [data, setData] = useState<MatchSummary[]>([]);

  useEffect(() => {
    axios
      .get<MatchSummary[]>(`/api/match-summary/${matchdayId}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error('Error loading match summary:', err));
  }, [matchdayId]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Post-Match Summary</h1>
      {data.map((m) => (
        <div key={m.matchId} className="border rounded p-3 mb-4">
          <h2 className="text-md font-semibold mb-1">
            {m.home} {m.score} {m.away}
          </h2>
          {m.events.length === 0 ? (
            <p className="text-sm text-gray-500">No events</p>
          ) : (
            <ul className="text-sm text-gray-700 pl-4 list-disc">
              {m.events.map((e, idx) => (
                <li key={idx}>
                  {e.minute}' - {e.type}: {e.desc}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
