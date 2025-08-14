import * as React from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import api from "@/services/axios";
import { useSocketEvent } from "@/hooks/useSocket";
import { useRequiredStage } from "@/hooks/useRequiredStage";
import { useGameState } from "@/store/GameStateStore";

import { AppCard } from "@/components/common/AppCard";
import MatchTicker, { type TickerGame } from "@/components/MatchBroadcast/MatchTicker";
import HalfTimePopup from "@/pages/HalfTimePopup";
import { type MatchEvent } from "@/components/MatchBroadcast/MatchEventFeed";
import { ProgressBar } from "@/components/common/ProgressBar";
import { isAxiosError } from "axios";

/* ------------------------------------------------------------------ */
/* DTOs – keep in sync with backend                                   */
/* ------------------------------------------------------------------ */
interface TeamDTO { id: number; name: string; }

interface MatchDTO {
  id: number;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
  homeGoals: number;
  awayGoals: number;
  minute?: number;    // updated by socket "match-tick"
  division: string;
}

interface MatchEventDTO {
  id?: number;               // present when loaded from REST
  matchId: number;
  minute: number;
  type: string;
  description: string;
  player?: { id: number; name: string } | null;
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

interface GameStateDTO {
  id: number;
  currentSaveGameId: number | null;
  currentMatchday: number;
  matchdayType: "LEAGUE" | "CUP";
  gameStage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";
}

interface TeamMatchInfoDTO {
  matchId: number;
  isHomeTeam: boolean;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function MatchDayLivePage() {
  // Soft-guard the route.
  useRequiredStage("MATCHDAY", { redirectTo: "/", graceMs: 4000 });

  const { currentMatchday, matchdayType, coachTeamId, gameStage, bootstrapping } = useGameState();

  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [eventsByMatch, setEventsByMatch] = useState<Record<number, MatchEventDTO[]>>({});
  const [popupMatchId, setPopupMatchId] = useState<number | null>(null);
  const [isHomeTeamForPopup, setIsHomeTeamForPopup] = useState<boolean>(true);

  const [lineup, setLineup] = useState<PlayerDTO[]>([]);
  const [bench, setBench] = useState<PlayerDTO[]>([]);
  const [subsRemaining, setSubsRemaining] = useState<number>(3);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // clock control
  const startedRef = useRef(false);
  const latestServerMinuteRef = useRef(0);
  const [localStartTs, setLocalStartTs] = useState<number | null>(null);
  const [localMinute, setLocalMinute] = useState<number>(0);

  /* ---------------------------------------------------------------- */
  /* Kick off simulation once we enter MATCHDAY                        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (bootstrapping) return;
    if (gameStage !== "MATCHDAY") return;
    if (startedRef.current) return;

    (async () => {
      try {
        const { data: gs } = await api.get<GameStateDTO>("/gamestate");
        const saveGameId = gs?.currentSaveGameId;
        if (!saveGameId) {
          console.warn("[MatchDayLive] No currentSaveGameId; cannot start simulation.");
          return;
        }
        await api.post("/matchday/advance", { saveGameId });
        startedRef.current = true;

        // start local fallback clock baseline
        setLocalStartTs(Date.now());
        setLocalMinute(0);
      } catch (e) {
        console.error("[MatchDayLive] Failed to start simulation via /matchday/advance:", e);
      }
    })();
  }, [bootstrapping, gameStage]);

  /* ---------------------------------------------------------------- */
  /* Local fallback clock (only if no server ticks). 1s = 1'           */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (gameStage !== "MATCHDAY" || localStartTs == null) return;
    const t = setInterval(() => {
      const sec = Math.floor((Date.now() - localStartTs) / 1000);
      setLocalMinute((m) => (sec > m ? Math.min(90, sec) : m));
    }, 250);
    return () => clearInterval(t);
  }, [gameStage, localStartTs]);

  // Pause local clock during halftime; resume when popup closes
  useEffect(() => {
    if (gameStage === "HALFTIME") {
      setLocalStartTs(null); // freeze baseline
    }
  }, [gameStage]);

  /* ---------------------------------------------------------------- */
  /* Initial data load (fixtures + existing events)                     */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (bootstrapping) return;
    if (gameStage !== "MATCHDAY" && gameStage !== "HALFTIME") return;
    if (!currentMatchday) return;

    let disposed = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: fetchedMatches }, { data: groupedEvents }] = await Promise.all([
          api.get<MatchDTO[]>("/matches", { params: { matchday: currentMatchday } }),
          api.get<Record<number, MatchEventDTO[]>>(`/match-events/by-matchday/${currentMatchday}`),
        ]);
        if (disposed) return;
        setMatches((prev) => mergePreserveMinuteAndScores(prev, fetchedMatches));
        setEventsByMatch((prev) => mergeGroupedEvents(prev, groupedEvents));
      } catch (e) {
        console.error("[MatchDayLive] Failed to load matchday data:", e);
        if (!disposed) setError("Failed to load live matchday data.");
      } finally {
        if (!disposed) setLoading(false);
      }
    })();
    return () => { disposed = true; };
  }, [bootstrapping, gameStage, currentMatchday]);

  /* ---------------------------------------------------------------- */
  /* Polling fallback to keep scores fresh if socket is quiet          */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if ((gameStage !== "MATCHDAY" && gameStage !== "HALFTIME") || !currentMatchday) return;
    let disposed = false;
    const handle = setInterval(async () => {
      try {
        const { data } = await api.get<MatchDTO[]>("/matches", { params: { matchday: currentMatchday } });
        if (!disposed) setMatches((prev) => mergePreserveMinuteAndScores(prev, data));
      } catch { /* ignore */ }
    }, 1000);
    return () => { disposed = true; clearInterval(handle); };
  }, [gameStage, currentMatchday]);

  /* ---------------------------------------------------------------- */
  /* Auto open halftime popup for the coached team                     */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (gameStage !== "HALFTIME") return;
    if (!coachTeamId || !currentMatchday) return;
    if (popupMatchId != null) return; // already open

    (async () => {
      try {
        const { data: gs } = await api.get<GameStateDTO>("/gamestate");
        const saveGameId = gs.currentSaveGameId;
        if (!saveGameId) return;

        const { data: info } = await api.get<TeamMatchInfoDTO>("/matchday/team-match-info", {
          params: { saveGameId, matchday: currentMatchday, teamId: coachTeamId },
        });

        setPopupMatchId(info.matchId);
        setIsHomeTeamForPopup(info.isHomeTeam);

        // preload formation for the coached side
        try {
          const side = info.isHomeTeam ? "home" : "away";
          const { data } = await api.get<MatchStateDTO>(`/matchstate/${info.matchId}`, { params: { side } });
          setLineup(data.lineup);
          setBench(data.bench);
          setSubsRemaining(data.subsRemaining);
        } catch (err) {
          if (!isAxiosError(err) || err.response?.status !== 404) {
            console.warn("[MatchDayLive] Unable to preload halftime state:", err);
          }
        }
      } catch (e) {
        console.warn("[MatchDayLive] Failed to auto-open halftime popup:", e);
      }
    })();
  }, [gameStage, coachTeamId, currentMatchday, popupMatchId]);

  /* ---------------------------------------------------------------- */
  /* Substitutions                                                     */
  /* ---------------------------------------------------------------- */
  const handleSub = useCallback(
    async ({ out, in: inId }: { out: number; in: number }) => {
      if (popupMatchId == null) return;
      try {
        await api.post(`/matches/${popupMatchId}/substitution`, {
          outId: out,
          inId,
          isHomeTeam: isHomeTeamForPopup,
        });
        const side = isHomeTeamForPopup ? "home" : "away";
        const { data } = await api.get<MatchStateDTO>(`/matchstate/${popupMatchId}`, { params: { side } });
        setLineup(data.lineup);
        setBench(data.bench);
        setSubsRemaining(data.subsRemaining);
      } catch (e) {
        console.error("[MatchDayLive] Substitution failed:", e);
      }
    },
    [popupMatchId, isHomeTeamForPopup]
  );

  /* ---------------------------------------------------------------- */
  /* WebSocket live updates                                           */
  /* ---------------------------------------------------------------- */
  useSocketEvent<MatchEventDTO>("match-event", (ev) => {
    if (gameStage !== "MATCHDAY" && gameStage !== "HALFTIME") return;
    setEventsByMatch((prev) => ({
      ...prev,
      [ev.matchId]: dedupeEvents([...(prev[ev.matchId] ?? []), ev]),
    }));
  });

  // Now match-tick carries scores too.
  useSocketEvent<Partial<MatchDTO>>("match-tick", (live) => {
    if (gameStage !== "MATCHDAY") return;
    setMatches((prev) => {
      const next = prev.map((m) =>
        m.id === live.id
          ? {
              ...m,
              minute: typeof live.minute === "number" ? live.minute : m.minute,
              homeGoals: typeof live.homeGoals === "number" ? live.homeGoals : m.homeGoals,
              awayGoals: typeof live.awayGoals === "number" ? live.awayGoals : m.awayGoals,
            }
          : m
      );
      const maxMin = Math.max(0, ...next.map((m) => m.minute ?? 0));
      if (maxMin >= latestServerMinuteRef.current) {
        latestServerMinuteRef.current = maxMin;
      }
      return next;
    });
  });

  /* ---------------------------------------------------------------- */
  /* Derived: unified minute + ticker payload                          */
  /* ---------------------------------------------------------------- */
  const unifiedMinute = useMemo(() => {
    const server = latestServerMinuteRef.current;
    const local = localMinute;
    return Math.max(server, local);
  }, [localMinute]);

  const tickerGames: TickerGame[] = useMemo(() => {
  return matches.map((m) => ({
    id: m.id,
    division: m.division,
    minute: m.minute ?? 0, // not shown by ticker when showMinute=false
    home: { id: m.homeTeam.id, name: m.homeTeam.name, score: m.homeGoals },
    away: { id: m.awayTeam.id, name: m.awayTeam.name, score: m.awayGoals },
    // ✅ convert MatchEventDTO -> TickerEvent and keep only the latest
    events: (eventsByMatch[m.id] ?? [])
      .slice(-1)
      .map((ev) => ({
        minute: ev.minute,
        type: ev.type,
        text: ev.description,
      })),
  }));
}, [matches, eventsByMatch]);

  const popupEvents: MatchEvent[] = React.useMemo(() => {
    if (popupMatchId == null) return [];
    return (eventsByMatch[popupMatchId] ?? []).map((ev, i) => ({
      id: ev.id ?? i,
      minute: ev.minute,
      text: ev.description,
    }));
  }, [eventsByMatch, popupMatchId]);

  const canSubstitute = React.useMemo(() => {
    if (popupMatchId == null || coachTeamId == null) return false;
    const match = matches.find((m) => m.id === popupMatchId);
    if (!match) return false;
    return match.homeTeam.id === coachTeamId || match.awayTeam.id === coachTeamId;
  }, [popupMatchId, coachTeamId, matches]);

  /* ---------------------------------------------------------------- */
  /* Stage gate / Loading / Error                                     */
  /* ---------------------------------------------------------------- */
  if (bootstrapping || (gameStage !== "MATCHDAY" && gameStage !== "HALFTIME")) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-green-900 text-white">
        <ProgressBar className="w-64" />
        <div className="text-sm/6 opacity-80">Waiting for matchday to start…</div>
      </div>
    );
  }

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
  /* Main render: UNIFIED CLOCK + single ticker                        */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white">
      {/* Unified clock ONLY */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {`Matchday ${currentMatchday} - ${matchdayType === "LEAGUE" ? "League" : "Cup"}`}
        </h1>
        <div className="rounded-xl bg-white/10 px-4 py-2 text-lg font-semibold tabular-nums">
          {unifiedMinute}'
        </div>
      </div>

      {/* Single ticker list; grouped by division; show latest event only */}
      <AppCard variant="outline" className="bg-white/10 p-4">
        <MatchTicker
          games={tickerGames}
          onGameClick={(id) => {
            const numId = Number(id);
            const m = matches.find(x => x.id === numId);
            if (m && coachTeamId) {
              if (m.homeTeam.id === coachTeamId) setIsHomeTeamForPopup(true);
              else if (m.awayTeam.id === coachTeamId) setIsHomeTeamForPopup(false);
              else setIsHomeTeamForPopup(true);
            } else {
              setIsHomeTeamForPopup(true);
            }
            setPopupMatchId(numId);
            const side = (m && coachTeamId && (m.awayTeam.id === coachTeamId)) ? "away" : "home";
            void api.get<MatchStateDTO>(`/matchstate/${numId}`, { params: { side } })
              .then(({ data }) => {
                setLineup(data.lineup);
                setBench(data.bench);
                setSubsRemaining(data.subsRemaining);
              })
              .catch(() => {/* ignore; user can retry during HT */});
          }}
          onTeamClick={async ({ matchId, isHome }) => {
            setPopupMatchId(matchId);
            setIsHomeTeamForPopup(isHome);
            try {
              const side = isHome ? "home" : "away";
              const { data } = await api.get<MatchStateDTO>(`/matchstate/${matchId}`, { params: { side } });
              setLineup(data.lineup);
              setBench(data.bench);
              setSubsRemaining(data.subsRemaining);
            } catch {
              /* ignore; popup still opens */
            }
          }}
          showMinute={false}
          groupByDivision
        />
      </AppCard>

      {popupMatchId !== null && (
        <HalfTimePopup
          open
          onClose={async () => {
            try {
              const { data: gs } = await api.get<GameStateDTO>("/gamestate");
              const saveGameId = gs.currentSaveGameId;
              if (saveGameId) {
                await api.post("/matchday/set-stage", { saveGameId, stage: "MATCHDAY" });
              }
            } catch (e) {
              console.warn("[MatchDayLive] Failed to resume MATCHDAY:", e);
            } finally {
              // resume local fallback from current unified minute
              const baseline = Math.max(latestServerMinuteRef.current, localMinute);
              setLocalStartTs(Date.now() - baseline * 1000);
              setPopupMatchId(null);
            }
          }}
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

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
function mergePreserveMinuteAndScores(prev: MatchDTO[], incoming: MatchDTO[]): MatchDTO[] {
  const prevById = new Map<number, MatchDTO>(prev.map(m => [m.id, m]));
  return incoming.map(n => {
    const old = prevById.get(n.id);
    return old
      ? {
          ...n,
          minute: old.minute ?? n.minute,
          // keep last known scores if server omitted them (shouldn’t, but safe)
          homeGoals: typeof n.homeGoals === "number" ? n.homeGoals : old.homeGoals,
          awayGoals: typeof n.awayGoals === "number" ? n.awayGoals : old.awayGoals,
        }
      : n;
  });
}

function dedupeEvents(list: MatchEventDTO[]): MatchEventDTO[] {
  const seen = new Set<string>();
  const out: MatchEventDTO[] = [];
  for (const ev of list) {
    const key = ev.id != null ? `id:${ev.id}` : `m:${ev.matchId}|t:${ev.minute}|d:${ev.description}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(ev);
    }
  }
  return out;
}

function mergeGroupedEvents(
  prev: Record<number, MatchEventDTO[]>,
  incoming: Record<number, MatchEventDTO[]>
): Record<number, MatchEventDTO[]> {
  const next: Record<number, MatchEventDTO[]> = { ...prev };
  for (const [matchIdStr, evs] of Object.entries(incoming)) {
    const matchId = Number(matchIdStr);
    next[matchId] = dedupeEvents([...(prev[matchId] ?? []), ...evs]);
  }
  return next;
}
