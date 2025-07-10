import { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import HalfTimePopup from './HalfTimePopup';

const socket = io('http://localhost:4000');

interface Team {
  id: number;
  name: string;
  primaryColor: string;
}

interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  division: string;
}

interface MatchEvent {
  matchId: number;
  description: string;
}

interface GameStateResponse {
  currentMatchday: number;
}

export default function MatchdayLive() {
  const [events, setEvents] = useState<Record<number, MatchEvent>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [popupMatchId, setPopupMatchId] = useState<number | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const gs = await axios.get<GameStateResponse>('/api/gamestate');
        const matchday = gs.data.currentMatchday;

        const [matchEventsRes, matchesRes] = await Promise.all([
          axios.get<MatchEvent[]>(`/api/match-events/${matchday}`),
          axios.get<Match[]>(`/api/matches/${matchday}`),
        ]);

        setMatches(matchesRes.data);

        const grouped: Record<number, MatchEvent> = {};
        for (const ev of matchEventsRes.data) {
          grouped[ev.matchId] = ev;
        }
        setEvents(grouped);
      } catch (err) {
        console.error('Failed to fetch matchday data:', err);
      }
    };

    fetchInitialData();

    const handleMatchEvent = (ev: MatchEvent) => {
      if (ev.matchId) {
        setEvents((prev) => ({ ...prev, [ev.matchId]: ev }));
      }
    };

    socket.on('match-event', handleMatchEvent);

    return () => {
      socket.off('match-event', handleMatchEvent);
    };
  }, []);

  const groupedByDivision = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const division = match.division || 'Other';
    if (!acc[division]) acc[division] = [];
    acc[division].push(match);
    return acc;
  }, {});

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
        <HalfTimePopup matchId={popupMatchId} onClose={() => setPopupMatchId(null)} />
      )}
    </div>
  );
}
