import * as React from "react";
import { useEffect, useMemo, useState } from "react";

import axios from "@/services/axios";
import { useSocketEvent } from "@/hooks/useSocket";
import { AppCard } from "@/components/common/AppCard";
import MatchTicker, {
  type TickerGame,
} from "@/components/MatchBroadcast/MatchTicker";
import HalfTimePopup from "@/pages/HalfTimePopup";
import { type MatchEvent } from "@/components/MatchBroadcast/MatchEventFeed";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ------------------------------------------------------------------ */
/* DTOs – keep in sync with backend                                   */
/* ------------------------------------------------------------------ */

interface TeamDTO {
  id: number;
  name: string;
  primaryColor: string;
}

interface MatchDTO {
  id: number;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
  homeScore: number | null;
  awayScore: number | null;
  minute: number;
  division: string;
}

interface MatchEventDTO {
  matchId: number;
  minute: number;
  type: string;
  description: string;
}

interface GameStateResponse {
  currentMatchday: number;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function MatchDayLivePage() {
  /* Local state ------------------------------------------------------ */
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [eventsByMatch, setEventsByMatch] = useState<
    Record<number, MatchEventDTO[]>
  >({});
  const [popupMatchId, setPopupMatchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Initial fetch ---------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { currentMatchday },
        } = await axios.get<GameStateResponse>("/gamestate");

        const [matchesRes, eventsRes] = await Promise.all([
          axios.get<MatchDTO[]>(`/matches/${currentMatchday}`),
          axios.get<MatchEventDTO[]>(`/match-events/${currentMatchday}`),
        ]);

        setMatches(matchesRes.data);

        const grouped: Record<number, MatchEventDTO[]> = {};
        eventsRes.data.forEach((ev) => {
          (grouped[ev.matchId] ??= []).push(ev);
        });
        setEventsByMatch(grouped);
      } catch {
        setError("Failed to load live matchday data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Socket updates --------------------------------------------------- */
  useSocketEvent<MatchEventDTO>("match-event", (ev) => {
    setEventsByMatch((prev) => ({
      ...prev,
      [ev.matchId]: [...(prev[ev.matchId] ?? []), ev],
    }));
  });

  useSocketEvent<Partial<MatchDTO>>("match-tick", (live) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === live.id ? { ...m, ...live } : m))
    );
  });

  /* Derive ticker rows ---------------------------------------------- */
  const tickerGames: TickerGame[] = matches.map((m) => {
    const latest = eventsByMatch[m.id]?.at(-1);
    return {
      id: m.id,
      division: m.division,
      minute: m.minute ?? 0,
      home: {
        id: m.homeTeam.id,
        name: m.homeTeam.name,
        score: m.homeScore ?? 0,
      },
      away: {
        id: m.awayTeam.id,
        name: m.awayTeam.name,
        score: m.awayScore ?? 0,
      },
      latestEvent: latest?.description ?? "",
    };
  });

  /* Build events for the selected match (id + text) ------------------ */
  const popupEvents: MatchEvent[] = useMemo(() => {
    if (popupMatchId == null) return [];
    return (eventsByMatch[popupMatchId] ?? []).map((ev, i) => ({
      id: i,
      minute: ev.minute,
      text: ev.description,
    }));
  }, [eventsByMatch, popupMatchId]);

  /* Loading / error UI ---------------------------------------------- */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-900 text-white">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-900 text-red-300">
        {error}
      </div>
    );
  }

  /* Render ----------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white">
      <h1 className="text-2xl font-bold">Live Matchday Broadcast</h1>

      <AppCard variant="outline" className="bg-white/10 p-4">
        <MatchTicker
          games={tickerGames}
          onGameClick={(id) => setPopupMatchId(Number(id))}
        />
      </AppCard>

      {popupMatchId !== null && (
        <HalfTimePopup
          open
          onClose={() => setPopupMatchId(null)}
          events={popupEvents}
          lineup={[]}        /* TODO: fetch real lineup   */
          bench={[]}         /* TODO: fetch real bench    */
          subsRemaining={3}  /* TODO: live value          */
          onSubstitute={(payload) => {
            console.log("Substitution sent:", payload);
          }}
        />
      )}
    </div>
  );
}
