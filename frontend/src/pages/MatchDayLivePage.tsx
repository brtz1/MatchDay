// frontend/src/pages/MatchDayLivePage.tsx
import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { getTeamMatchInfo } from "@/services/axios";
import { useSocketEvent } from "@/hooks/useSocket";
import { useGameState } from "@/store/GameStateStore";
import { connectSocket, joinSaveRoom, leaveSaveRoom } from "@/socket";
import { AppCard } from "@/components/common/AppCard";
import MatchTicker, { type TickerGame } from "@/components/MatchBroadcast/MatchTicker";
import HalfTimePopup from "@/pages/HalfTimePopup";
import { type MatchEvent } from "@/components/MatchBroadcast/MatchEventFeed";
import { ProgressBar } from "@/components/common/ProgressBar";
import { isAxiosError } from "axios";
import { standingsUrl, cupUrl } from "@/utils/paths";

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
  /** NEW: provided by backend so FE can optimistically update the score */
  isHomeTeam?: boolean;
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
type GameStage = GameStateDTO["gameStage"];

/** Socket payloads */
interface MatchTickPayload {
  matchId: number;
  minute: number;
  homeGoals?: number;
  awayGoals?: number;
  id?: number; // legacy
}
interface StageChangedPayload {
  gameStage: GameStage;
}

/** Reasons from the engine that trigger a pause */
type EnginePauseReason = "INJURY" | "GK_INJURY" | "GK_RED_NEEDS_GK";
type PauseReason = EnginePauseReason | "HALFTIME" | "COACH_PAUSE";

interface PauseRequestPayload {
  matchId: number;
  isHomeTeam: boolean;
  reason: EnginePauseReason;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function MatchDayLivePage() {
  const navigate = useNavigate();

  // From GameState store (no 'loading' assumed)
  const {
    currentMatchday,
    matchdayType,
    coachTeamId,
    gameStage,
    saveGameId,          // some stores use this
    currentSaveGameId,   // others use this
  } = useGameState();

  // Prefer store id if present; otherwise resolve via /gamestate
  const storeSaveId =
    (typeof saveGameId === "number" ? saveGameId : undefined) ??
    (typeof currentSaveGameId === "number" ? currentSaveGameId : undefined);

  // resolvedSaveId:
  //   undefined => unknown yet (do NOT redirect)
  //   number    => known active save id
  //   null      => definitely no save (redirect to Title)
  const [resolvedSaveId, setResolvedSaveId] = useState<number | null | undefined>(undefined);

  // resolve save id once if store doesn't have it
  useEffect(() => {
    let cancelled = false;

    if (typeof storeSaveId === "number") {
      setResolvedSaveId(storeSaveId);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get<GameStateDTO>("/gamestate");
        if (cancelled) return;
        setResolvedSaveId(data.currentSaveGameId ?? null);
      } catch {
        if (cancelled) return;
        // stay "unknown" to avoid false redirects
        setResolvedSaveId(undefined);
      }
    })();

    return () => { cancelled = true; };
  }, [storeSaveId]);

  // Immediate stage mirror (socket-first, store may lag)
  const [liveStage, setLiveStage] = useState<GameStage>(gameStage);
  useSocketEvent<StageChangedPayload>("stage-changed", (p) => setLiveStage(p.gameStage));
  useEffect(() => {
    if (gameStage && gameStage !== liveStage) setLiveStage(gameStage);
  }, [gameStage, liveStage]);

  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [eventsByMatch, setEventsByMatch] = useState<Record<number, MatchEventDTO[]>>({});
  const [popupMatchId, setPopupMatchId] = useState<number | null>(null);
  const [isHomeTeamForPopup, setIsHomeTeamForPopup] = useState<boolean>(true);
  const [lineup, setLineup] = useState<PlayerDTO[]>([]);
  const [bench, setBench] = useState<PlayerDTO[]>([]);
  const [subsRemaining, setSubsRemaining] = useState<number>(3);
  const [pauseReason, setPauseReason] = useState<PauseReason | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-authoritative clock
  const [serverMinute, setServerMinute] = useState<number>(0);

  /* ---------------------------------------------------------------- */
  /* Inline guard with grace window                                   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    // 1) Unknown: do nothing yet.
    if (resolvedSaveId === undefined) return;

    // 2) Null on first read: recheck once before deciding.
    if (resolvedSaveId === null) {
      const t = setTimeout(async () => {
        try {
          const { data } = await api.get<GameStateDTO>("/gamestate");
          setResolvedSaveId(data.currentSaveGameId ?? null);
        } catch {
          // keep as null; we'll handle below on next run
        }
      }, 500);
      return () => clearTimeout(t);
    }

    // 3) Stage gate (allow MATCHDAY / HALFTIME / RESULTS).
    const ALLOWED = new Set<GameStage>(["MATCHDAY", "HALFTIME", "RESULTS"]);
    if (liveStage && !ALLOWED.has(liveStage)) {
      // Wait briefly for stage to settle before sending the user away.
      const t = setTimeout(() => {
        navigate(`/team/${coachTeamId ?? ""}`, { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [resolvedSaveId, liveStage, coachTeamId, navigate]);

  /* ---------------------------------------------------------------- */
  /* Join the save-specific socket room                               */
  /* ---------------------------------------------------------------- */
  const effectiveSaveId =
    (typeof storeSaveId === "number" ? storeSaveId : undefined) ??
    (typeof resolvedSaveId === "number" ? resolvedSaveId : undefined);

  useEffect(() => {
    connectSocket(); // idempotent
    if (typeof effectiveSaveId === "number" && !Number.isNaN(effectiveSaveId)) {
      let disposed = false;
      (async () => {
        try {
          await joinSaveRoom(effectiveSaveId, { waitAck: true, timeoutMs: 3000 });
        } catch {
          // non-fatal
        }
        if (disposed) return;
      })();
      return () => {
        void leaveSaveRoom(effectiveSaveId);
      };
    }
  }, [effectiveSaveId]);

  /* ---------------------------------------------------------------- */
  /* Initial data load (fixtures + existing events)                    */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!currentMatchday) return;

    let disposed = false;
    (async () => {
      setPageLoading(true);
      setError(null);
      try {
        const [{ data: fetchedMatches }, { data: groupedEvents }] = await Promise.all([
          api.get<MatchDTO[]>("/matches", { params: { matchday: currentMatchday } }),
          api.get<Record<number, MatchEventDTO[]>>(`/match-events/by-matchday/${currentMatchday}`),
        ]);
        if (disposed) return;
        setMatches(
          fetchedMatches.map((m) => ({
            ...m,
            homeGoals: Number(m.homeGoals ?? (m as any).homeScore ?? 0),
            awayGoals: Number(m.awayGoals ?? (m as any).awayScore ?? 0),
            minute: Number((m as any).minute ?? 0),
          }))
        );

        setEventsByMatch(groupedEvents ?? {});
      } catch (e) {
        console.error("[MatchDayLive] Failed to load matchday data:", e);
        if (!disposed) setError("Failed to load live matchday data.");
      } finally {
        if (!disposed) setPageLoading(false);
      }
    })();
    return () => { disposed = true; };
  }, [currentMatchday]);

  /* ---------------------------------------------------------------- */
  /* setStage helper                                                   */
  /* ---------------------------------------------------------------- */
  const setStage = useCallback(async (stage: GameStage) => {
    try {
      let sid = effectiveSaveId;
      if (typeof sid !== "number") {
        const { data } = await api.get<GameStateDTO>("/gamestate");
        sid = data.currentSaveGameId ?? undefined;
      }
      if (typeof sid !== "number") return;
      await api.post("/matchday/set-stage", { saveGameId: sid, stage });
    } catch (e) {
      console.warn("[MatchDayLive] setStage failed:", e);
    }
  }, [effectiveSaveId]);

  /* ---------------------------------------------------------------- */
  /* Auto open halftime popup for the coached team (HALFTIME)          */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const stage = liveStage;
    if (stage !== "HALFTIME") return;
    if (!coachTeamId || !currentMatchday) return;
    if (popupMatchId != null) return;

    (async () => {
      try {
        let matchId: number | null = null;
        let isHomeTeam = true;

        try {
          const sid =
            (typeof effectiveSaveId === "number" ? effectiveSaveId : undefined) ??
            (await api.get<GameStateDTO>("/gamestate")).data.currentSaveGameId ??
            null;
          if (!sid) return;
          const info = await getTeamMatchInfo(sid, currentMatchday, coachTeamId);
          matchId = info.matchId;
          isHomeTeam = info.isHomeTeam;
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 404) {
            const fallback = matches.find(
              (m) => m.homeTeam.id === coachTeamId || m.awayTeam.id === coachTeamId
            );
            if (fallback) {
              matchId = fallback.id;
              isHomeTeam = fallback.homeTeam.id === coachTeamId;
            } else {
              return;
            }
          } else {
            return;
          }
        }

        setPopupMatchId(matchId!);
        setIsHomeTeamForPopup(isHomeTeam);
        setPauseReason((prev) => prev ?? "HALFTIME");

        try {
          const side = isHomeTeam ? "home" : "away";
          const { data } = await api.get<MatchStateDTO>(`/matchstate/${matchId}`, { params: { side } });
          setLineup(data.lineup);
          setBench(data.bench);
          setSubsRemaining(data.subsRemaining);
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
    })();
  }, [liveStage, coachTeamId, currentMatchday, popupMatchId, matches, effectiveSaveId]);

  /* ---------------------------------------------------------------- */
  /* Server-initiated pause                                            */
  /* ---------------------------------------------------------------- */
  useSocketEvent<PauseRequestPayload>("pause-request", async (p) => {
    const m = matches.find((x) => x.id === p.matchId);
    if (m && typeof coachTeamId === "number") {
      const teamId = p.isHomeTeam ? m.homeTeam.id : m.awayTeam.id;
      if (teamId !== coachTeamId) return;
    }
    setLiveStage("HALFTIME");
    setPopupMatchId(p.matchId);
    setIsHomeTeamForPopup(p.isHomeTeam);
    setPauseReason(p.reason);

    try {
      const side = p.isHomeTeam ? "home" : "away";
      const { data } = await api.get<MatchStateDTO>(`/matchstate/${p.matchId}`, { params: { side } });
      setLineup(data.lineup);
      setBench(data.bench);
      setSubsRemaining(data.subsRemaining);
    } catch {
      /* ignore */
    }
  });

  /* ---------------------------------------------------------------- */
  /* Substitutions                                                     */
  /* ---------------------------------------------------------------- */
  const handleSub = useCallback(
    async ({ out, in: inId }: { out: number; in: number }) => {
      if (popupMatchId == null) return;
      if (subsRemaining <= 0) return;
      try {
        await api.post(`/matchstate/${popupMatchId}/substitute`, {
          out,
          in: inId,
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
    [popupMatchId, isHomeTeamForPopup, subsRemaining]
  );

  /* ---------------------------------------------------------------- */
  /* WebSocket live updates                                            */
  /* ---------------------------------------------------------------- */
  useSocketEvent<MatchEventDTO>("match-event", (ev) => {
    if (liveStage !== "MATCHDAY" && liveStage !== "HALFTIME") return;

    // Append/dedupe event feed
    setEventsByMatch((prev) => ({
      ...prev,
      [ev.matchId]: dedupeEvents([...(prev[ev.matchId] ?? []), ev]),
    }));

    // Optimistic scoreboard bump on GOAL using isHomeTeam flag
    if (ev.type === "GOAL" && typeof ev.isHomeTeam === "boolean") {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== ev.matchId) return m;
          return {
            ...m,
            homeGoals: ev.isHomeTeam ? m.homeGoals + 1 : m.homeGoals,
            awayGoals: !ev.isHomeTeam ? m.awayGoals + 1 : m.awayGoals,
          };
        })
      );
    }
  });

  useSocketEvent<MatchTickPayload>("match-tick", (live) => {
    if (liveStage !== "MATCHDAY" && liveStage !== "HALFTIME") return;

    setServerMinute((prev) => (live.minute > prev ? live.minute : prev));

    setMatches((prev) =>
      prev.map((m) =>
        m.id === live.matchId
          ? {
              ...m,
              minute: live.minute,
              homeGoals: typeof live.homeGoals === "number" ? live.homeGoals : m.homeGoals,
              awayGoals: typeof live.awayGoals === "number" ? live.awayGoals : m.awayGoals,
            }
          : m
      )
    );
  });

  /* ---------------------------------------------------------------- */
  /* 90' freeze → Results                                              */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (liveStage !== "RESULTS") return;
    const to = matchdayType === "LEAGUE" ? standingsUrl : cupUrl;
    const t = setTimeout(() => navigate(to, { state: { cameFromResults: true } }), 3000);
    return () => clearTimeout(t);
  }, [liveStage, matchdayType, navigate]);

  /* ---------------------------------------------------------------- */
  /* Ticker payload                                                    */
  /* ---------------------------------------------------------------- */
  const tickerGames: TickerGame[] = useMemo(() => {
    return matches.map((m) => ({
      id: m.id,
      division: m.division,
      minute: m.minute ?? 0,
      home: { id: m.homeTeam.id, name: m.homeTeam.name, score: m.homeGoals },
      away: { id: m.awayTeam.id, name: m.awayTeam.name, score: m.awayGoals },
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
    const isCoachSide = match.homeTeam.id === coachTeamId || match.awayTeam.id === coachTeamId;
    return isCoachSide && subsRemaining > 0;
  }, [popupMatchId, coachTeamId, matches, subsRemaining]);

  /* ---------------------------------------------------------------- */
  /* Stage gate / Loading / Error                                     */
  /* ---------------------------------------------------------------- */
  if (resolvedSaveId === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-900 text-white">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  if (pageLoading) {
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
  /* Main render: SERVER CLOCK + single ticker                         */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white">
      {/* Server authoritative clock ONLY */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {`Matchday ${currentMatchday} - ${matchdayType === "LEAGUE" ? "League" : "Cup"}`}
        </h1>
        <div className="rounded-xl bg-white/10 px-4 py-2 text-lg font-semibold tabular-nums">
          {serverMinute}'
        </div>
      </div>

      <AppCard variant="outline" className="bg-white/10 p-4">
        <MatchTicker
          games={tickerGames}
          onGameClick={(id) => {
            const numId = Number(id);
            const m = matches.find((x) => x.id === numId);
            if (m && coachTeamId) {
              if (m.homeTeam.id === coachTeamId) setIsHomeTeamForPopup(true);
              else if (m.awayTeam.id === coachTeamId) setIsHomeTeamForPopup(false);
              else setIsHomeTeamForPopup(true);
            } else {
              setIsHomeTeamForPopup(true);
            }
            setPopupMatchId(numId);
            setPauseReason(null);
            const side = m && coachTeamId && m.awayTeam.id === coachTeamId ? "away" : "home";
            void api
              .get<MatchStateDTO>(`/matchstate/${numId}`, { params: { side } })
              .then(({ data }) => {
                setLineup(data.lineup);
                setBench(data.bench);
                setSubsRemaining(data.subsRemaining);
              })
              .catch(() => { /* ignore */ });
          }}
          onTeamClick={async ({ matchId, isHome }) => {
            setPopupMatchId(matchId);
            setIsHomeTeamForPopup(isHome);
            setPauseReason("COACH_PAUSE");
            await setStage("HALFTIME");
            try {
              const side = isHome ? "home" : "away";
              const { data } = await api.get<MatchStateDTO>(`/matchstate/${matchId}`, { params: { side } });
              setLineup(data.lineup);
              setBench(data.bench);
              setSubsRemaining(data.subsRemaining);
            } catch { /* ignore */ }
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
              await setStage("MATCHDAY");
            } catch (e) {
              console.warn("[MatchDayLive] Failed to resume MATCHDAY:", e);
            } finally {
              setPopupMatchId(null);
              setPauseReason(null);
            }
          }}
          events={popupEvents}
          lineup={lineup}
          bench={bench}
          subsRemaining={subsRemaining}
          onSubstitute={handleSub}
          canSubstitute={canSubstitute}
          pauseReason={pauseReason ?? undefined}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
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
