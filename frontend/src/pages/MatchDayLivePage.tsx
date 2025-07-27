import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/axios";
import { useSocketEvent } from "@/hooks/useSocket";

import { AppCard } from "@/components/common/AppCard";
import MatchTicker, { type TickerGame } from "@/components/MatchBroadcast/MatchTicker";
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
  secondaryColor: string;
}

interface MatchDTO {
  id: number;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
  homeGoals: number;
  awayGoals: number;
  minute?: number;
  division: string;
}

interface MatchEventDTO {
  matchId: number;
  minute: number;
  type: string;
  description: string;
  player?: {
    id: number;
    name: string;
  };
}

interface GameStateResponse {
  currentMatchday: number;
  matchdayType: "LEAGUE" | "CUP";
  coachTeamId: number;
}

export interface PlayerDTO {
  id: number;
  name: string;
  position: string;
  rating: number;
  isInjured: boolean;
}

interface MatchStateDTO {
  lineup: PlayerDTO[];
  bench: PlayerDTO[];
  subsRemaining: number;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function MatchDayLivePage() {
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [eventsByMatch, setEventsByMatch] = useState<Record<number, MatchEventDTO[]>>({});
  const [popupMatchId, setPopupMatchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentMatchday, setCurrentMatchday] = useState<number | null>(null);
  const [matchdayType, setMatchdayType] = useState<"LEAGUE" | "CUP">("LEAGUE");
  const [coachTeamId, setCoachTeamId] = useState<number | null>(null);

  const [lineup, setLineup] = useState<PlayerDTO[]>([]);
  const [bench, setBench] = useState<PlayerDTO[]>([]);
  const [subsRemaining, setSubsRemaining] = useState<number>(3);

  /* ---------------------------------------------------------------- */
  /* Fetch fixtures, events & game state                              */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: gs } = await api.get<GameStateResponse>("/gamestate");
        setCurrentMatchday(gs.currentMatchday);
        setMatchdayType(gs.matchdayType);
        setCoachTeamId(gs.coachTeamId);

        const { data: fetchedMatches } = await api.get<MatchDTO[]>("/matches", {
          params: { matchday: gs.currentMatchday },
        });
        setMatches(fetchedMatches);

        const { data: groupedEvents } = await api.get<Record<number, MatchEventDTO[]>>(
          `/match-events/by-matchday/${gs.currentMatchday}`
        );
        setEventsByMatch(groupedEvents);
      } catch (e) {
        console.error("Failed to load matchday data:", e);
        setError("Failed to load live matchday data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------------------------------------------------------- */
  /* Fetch match state (lineup + bench) for half-time popup           */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (popupMatchId !== null) {
      (async () => {
        try {
          const { data } = await api.get<MatchStateDTO>(`/matchstate/${popupMatchId}`);
          setLineup(data.lineup);
          setBench(data.bench);
          setSubsRemaining(data.subsRemaining);
        } catch (e) {
          console.error("Failed to load match state:", e);
        }
      })();
    }
  }, [popupMatchId]);

  /* ---------------------------------------------------------------- */
  /* Substitution handler                                             */
  /* ---------------------------------------------------------------- */
  async function handleSub({ out, in: inId }: { out: number; in: number }) {
    if (popupMatchId == null) return;
    try {
      await api.post(`/matchstate/${popupMatchId}/substitute`, {
        out,
        in: inId,
        isHomeTeam: true,
      });
      const { data } = await api.get<MatchStateDTO>(`/matchstate/${popupMatchId}`);
      setLineup(data.lineup);
      setBench(data.bench);
      setSubsRemaining(data.subsRemaining);
    } catch (e) {
      console.error("Substitution failed:", e);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Real-time updates via WebSocket                                  */
  /* ---------------------------------------------------------------- */
  useSocketEvent<MatchEventDTO>("match-event", (ev) => {
    setEventsByMatch((prev) => ({
      ...prev,
      [ev.matchId]: [...(prev[ev.matchId] ?? []), ev],
    }));
  });

  useSocketEvent<Partial<MatchDTO>>("match-tick", (live) => {
    setMatches((prev) => prev.map((m) => (m.id === live.id ? { ...m, ...live } : m)));
  });

  /* ---------------------------------------------------------------- */
  /* Prepare data for ticker & popup                                  */
  /* ---------------------------------------------------------------- */
  const tickerGames: TickerGame[] = matches.map((m) => ({
    id: m.id,
    division: m.division,
    minute: m.minute ?? 0,
    home: { id: m.homeTeam.id, name: m.homeTeam.name, score: m.homeGoals },
    away: { id: m.awayTeam.id, name: m.awayTeam.name, score: m.awayGoals },
    latestEvent: eventsByMatch[m.id]?.slice(-1)[0]?.description ?? "",
  }));

  const popupEvents: MatchEvent[] = useMemo(() => {
    if (popupMatchId == null) return [];
    return (eventsByMatch[popupMatchId] ?? []).map((ev, i) => ({
      id: i,
      minute: ev.minute,
      text: ev.description,
    }));
  }, [eventsByMatch, popupMatchId]);

  const canSubstitute = useMemo(() => {
    if (popupMatchId == null || coachTeamId == null) return false;
    const match = matches.find((m) => m.id === popupMatchId);
    if (!match) return false;
    return match.homeTeam.id === coachTeamId;
  }, [popupMatchId, coachTeamId, matches]);

  /* ---------------------------------------------------------------- */
  /* Loading/Error state                                              */
  /* ---------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------- */
  /* Main render                                                      */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white">
      <h1 className="text-2xl font-bold">
        {`Matchday ${currentMatchday} - ${
          matchdayType === "LEAGUE" ? "League" : "Cup"
        }`}
      </h1>

      <AppCard variant="outline" className="bg-white/10 p-4">
        <MatchTicker games={tickerGames} onGameClick={(id) => setPopupMatchId(Number(id))} />
      </AppCard>

      {popupMatchId !== null && (
        <HalfTimePopup
          open
          onClose={() => setPopupMatchId(null)}
          events={popupEvents}
          lineup={lineup}
          bench={bench}
          subsRemaining={subsRemaining}
          onSubstitute={handleSub}
          canSubstitute={canSubstitute}
        />
      )}
    </div>
  );
}
