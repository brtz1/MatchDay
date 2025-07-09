import { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import HalfTimePopup from './HalfTimePopup';

const socket = io('http://localhost:4000');

export default function MatchdayLive() {
  const [events, setEvents] = useState<Record<number, any>>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [popupMatchId, setPopupMatchId] = useState<number | null>(null);

  useEffect(() => {
    axios.get('/api/gamestate').then(async (gs) => {
      const md = await axios.get(`/api/match-events/${gs.data.currentMatchday}`);
      const allMatches = await axios.get(`/api/matches/${gs.data.currentMatchday}`);
      setMatches(allMatches.data);
      const grouped: Record<number, any> = {};
      for (const ev of md.data) {
        grouped[ev.matchId] = ev;
      }
      setEvents(grouped);
    });

    socket.on('match-event', (ev) => {
      if (ev.matchId) {
        setEvents((prev) => ({ ...prev, [ev.matchId]: ev }));
      }
    });

    return () => socket.off('match-event');
  }, []);

  const groupedByDivision = matches.reduce((acc, match) => {
    const div = match.division || 'Other';
    if (!acc[div]) acc[div] = [];
    acc[div].push(match);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Live Matchday Broadcast</h1>
      {Object.entries(groupedByDivision).map(([division, games]) => (
        <div key={division} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{division}</h2>
          {games.map((match) => (
            <div
              key={match.id}
              className="flex items-center justify-between p-2 border rounded mb-2 cursor-pointer"
              onClick={() => setPopupMatchId(match.id)}
            >
              <div className="flex items-center gap-4">
                <span
                  className="px-2 py-1 rounded text-white"
                  style={{ backgroundColor: match.homeTeam.primaryColor }}
                >
                  {match.homeTeam.name}
                </span>
                <span className="font-bold text-lg">
                  {match.homeScore ?? 0} x {match.awayScore ?? 0}
                </span>
                <span
                  className="px-2 py-1 rounded text-white"
                  style={{ backgroundColor: match.awayTeam.primaryColor }}
                >
                  {match.awayTeam.name}
                </span>
              </div>
              <div className="text-sm italic text-gray-700">
                {events[match.id]?.description ?? ''}
              </div>
            </div>
          ))}
        </div>
      ))}

      {popupMatchId && (
        <HalfTimePopup
          matchId={popupMatchId}
          onClose={() => setPopupMatchId(null)}
        />
      )}
    </div>
  );
}
