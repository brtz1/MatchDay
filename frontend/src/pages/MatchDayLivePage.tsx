// frontend/src/pages/MatchDayLivePage.tsx

import * as React from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { getTeamMatchInfo } from "@/services/axios";
import { useSocketEvent } from "@/hooks/useSocket";
import { useGameState } from "@/store/GameStateStore";
import { connectSocket, joinSaveRoom, leaveSaveRoom } from "@/socket";
import { AppCard } from "@/components/common/AppCard";
import MatchTicker, { type TickerGame } from "@/components/MatchBroadcast/MatchTicker";
import HalfTimePopup from "@/pages/HalfTimePopup";
import InjuryPopup from "@/components/MatchBroadcast/InjuryPopup";
import GKRedPopup from "@/components/MatchBroadcast/GKRedPopup";
import { type MatchEvent } from "@/components/MatchBroadcast/MatchEventFeed";
import { ProgressBar } from "@/components/common/ProgressBar";
import { isAxiosError } from "axios";
import { standingsUrl, cupUrl } from "@/utils/paths";

/* ⬇️ In-match penalty picker */
import PenaltyKickPopup from "@/components/pk/PenaltyKickPopup";
import type { PlayerLite, Position } from "@/components/pk/PenaltyKickPopup";

/* ------------------------------------------------------------------ */
/* DTOs – keep in sync with backend                                   */
/* ------------------------------------------------------------------ */
interface TeamDTO {
  id: number;
  name: string;
}

interface MatchDTO {
  id: number;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
  homeGoals: number;
  awayGoals: number;
  minute?: number;
  division: string;
  /** Phase of play, populated live from 'match-tick' */
  phase?: "NORMAL" | "ET" | "PENS";
}

interface MatchEventDTO {
  id?: number;
  matchId: number;
  minute: number;
  type: string;
  description: string;
  player?: { id: number; name: string } | null;
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
  gameStage:
    | "ACTION"
    | "MATCHDAY"
    | "HALFTIME"
    | "RESULTS"
    | "STANDINGS"
    | "PENALTIES";
}
type GameStage = GameStateDTO["gameStage"];

/** Socket payloads */
interface MatchTickPayload {
  matchId: number;
  minute: number;
  homeGoals?: number;
  awayGoals?: number;
  /** Phase sent by backend: 'NORMAL' (0–90), 'ET' (91–120), 'PENS' (during shootout) */
  phase?: "NORMAL" | "ET" | "PENS";
  id?: number; // legacy
}
interface StageChangedPayload {
  gameStage: GameStage;
}

/** Reasons from the engine that trigger a pause */
type EnginePauseReason = "INJURY" | "GK_INJURY" | "GK_RED_NEEDS_GK" | "ET_HALF";
type PauseReason = EnginePauseReason | "HALFTIME" | "COACH_PAUSE";

/** Pause request payload */
interface PauseRequestPayload {
  matchId: number;
  isHomeTeam: boolean;
  reason: EnginePauseReason;
  player?: { id: number; name: string; position?: string | null; rating?: number };
}

/** ⬇️ PK socket payloads (minimal, FE-friendly) */
type PenaltyAwardedPayload = { matchId: number; isHome: boolean };
type PenaltyResultPayload = {
  matchId: number;
  isHome: boolean;
  shooterId: number;
  outcome: "GOAL" | "MISS" | "SAVE";
  newScore?: { home: number; away: number };
};

/* ------------------------------------------------------------------ */
/* helpers to avoid `any` and normalize positions                     */
/* ------------------------------------------------------------------ */
function numberProp(obj: unknown, key: string): number | undefined {
  if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[key];
    return typeof v === "number" ? v : undefined;
  }
  return undefined;
}

function normalizePosition(p: string): Position {
  const up = p.trim().toUpperCase();
  if (up.startsWith("GK") || up.includes("KEEP")) return "GK";
  if (up === "D" || up.startsWith("DF") || up.startsWith("DEF")) return "DF";
  if (up === "M" || up.startsWith("MF") || up.startsWith("MID")) return "MF";
  // ST, FW, F, ATT, AT → "AT"
  if (up === "F" || up === "FW" || up.startsWith("ST") || up.startsWith("ATT") || up === "AT")
    return "AT";
  return "MF"; // safe fallback
}

function mapToPlayerLite(list: PlayerDTO[]): PlayerLite[] {
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    rating: p.rating,
    position: normalizePosition(p.position),
  }));
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function MatchDayLive() {
  const navigate = useNavigate();

  const {
    currentMatchday,
    matchdayType,
    coachTeamId,
    gameStage,
    saveGameId,
    currentSaveGameId,
  } = useGameState();

  const isCupDay = matchdayType === "CUP";

  const storeSaveId =
    (typeof saveGameId === "number" ? saveGameId : undefined) ??
    (typeof currentSaveGameId === "number" ? currentSaveGameId : undefined);

  const [resolvedSaveId, setResolvedSaveId] = useState<number | null | undefined>(undefined);

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
        setResolvedSaveId(undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeSaveId]);

  // Immediate stage mirror (socket-first, store may lag)
  const [liveStage, setLiveStage] = useState<GameStage>(gameStage);
  useSocketEvent<StageChangedPayload>("stage-changed", (p) => {
    console.log("[Live] socket stage-changed →", p.gameStage);
    setLiveStage(p.gameStage);

    // ⬇️ If the backend moved us to the penalties stage, jump to PK screen.
    if (p.gameStage === "PENALTIES") {
      navigate("/pk", { replace: true });
    }
  });
  useEffect(() => {
    if (gameStage && gameStage !== liveStage) {
      console.log("[Live] store gameStage →", gameStage);
      setLiveStage(gameStage);
      if (gameStage === "PENALTIES") {
        navigate("/pk", { replace: true });
      }
    }
  }, [gameStage, liveStage, navigate]);

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

  // Player that caused the pause (injury/GK red)
  const [incidentPlayer, setIncidentPlayer] = useState<{
    id: number;
    name: string;
    position: string;
    rating?: number;
  } | null>(null);

  // Server-authoritative clock
  const [serverMinute, setServerMinute] = useState<number>(0);

  // Prevent spam clicks while pausing/fetching
  const teamClickLockRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /* ⬇️ NEW — in-match penalty popup state                             */
  /* ---------------------------------------------------------------- */
  const [pkOpen, setPkOpen] = useState(false);
  const [pkMatchId, setPkMatchId] = useState<number | null>(null);
  const [pkLineup, setPkLineup] = useState<PlayerDTO[]>([]);
  const [pkTeamName, setPkTeamName] = useState<string>("");

  /* ---------------------------------------------------------------- */
  /* Inline guard with grace window                                   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (resolvedSaveId === undefined) return;

    if (resolvedSaveId === null) {
      const t = setTimeout(async () => {
        try {
          const { data } = await api.get<GameStateDTO>("/gamestate");
          setResolvedSaveId(data.currentSaveGameId ?? null);
        } catch {
          /* keep as null */
        }
      }, 500);
      return () => clearTimeout(t);
    }

    // Allow MATCHDAY/HALFTIME/RESULTS/STANDINGS/PENALTIES on this page
    const ALLOWED = new Set<GameStage>([
      "MATCHDAY",
      "HALFTIME",
      "RESULTS",
      "STANDINGS",
      "PENALTIES",
    ]);
    if (liveStage && !ALLOWED.has(liveStage)) {
      const t = setTimeout(() => {
        navigate(`/team/${coachTeamId ?? ""}`, { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }

    // If we happen to be here while stage is already PENALTIES, jump now
    if (liveStage === "PENALTIES") {
      navigate("/pk", { replace: true });
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
          /* non-fatal */
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
          api.get<Record<number, MatchEventDTO[]>>(
            `/match-events/by-matchday/${currentMatchday}`,
          ),
        ]);
        if (disposed) return;

        const mapped = fetchedMatches.map((m) => ({
          ...m,
          homeGoals: Number(m.homeGoals ?? numberProp(m, "homeScore") ?? 0),
          awayGoals: Number(m.awayGoals ?? numberProp(m, "awayScore") ?? 0),
          minute: Number(numberProp(m, "minute") ?? 0),
          // phase will be set by live ticks
        }));

        const sorted = sortUserMatchFirst(mapped, coachTeamId);
        setMatches(sorted);

        setEventsByMatch(groupedEvents ?? {});
      } catch (e) {
        console.error("[MatchDayLive] Failed to load matchday data:", e);
        if (!disposed) setError("Failed to load live matchday data.");
      } finally {
        if (!disposed) setPageLoading(false);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [currentMatchday, coachTeamId]);

  useEffect(() => {
    if (!coachTeamId || matches.length === 0) return;
    setMatches((prev) => sortUserMatchFirst(prev, coachTeamId));
  }, [coachTeamId, matches.length]);

  /* ---------------------------------------------------------------- */
  /* setStage helper                                                   */
  /* ---------------------------------------------------------------- */
  const setStage = useCallback(
    async (stage: GameStage) => {
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
    },
    [effectiveSaveId],
  );

  /* ---------------------------------------------------------------- */
  /* ⬇️ NEW: Pause-all helper                                          */
  /* ---------------------------------------------------------------- */
  const pauseAllMatches = useCallback(async () => {
    try {
      // Try dedicated endpoint first (if your BE exposes /matchday/pause)
      try {
        let sid = effectiveSaveId;
        if (typeof sid !== "number") {
          const { data } = await api.get<GameStateDTO>("/gamestate");
          sid = data.currentSaveGameId ?? undefined;
        }
        if (typeof sid === "number") {
          await api.post("/matchday/pause", { saveGameId: sid });
          return; // success — whole engine paused
        }
      } catch {
        // fall back to per-match pause below
      }

      // Fallback: pause each match individually
      await Promise.allSettled(
        matches.map((m) =>
          api.post(`/matchstate/${m.id}/pause`, { isPaused: true }).catch(() => undefined),
        ),
      );
    } catch (e) {
      console.warn("[Live] pauseAllMatches failed:", e);
    }
  }, [effectiveSaveId, matches]);

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
              (m) => m.homeTeam.id === coachTeamId || m.awayTeam.id === coachTeamId,
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
        setIncidentPlayer(null);

        try {
          const side = isHomeTeam ? "home" : "away";
          const { data } = await api.get<MatchStateDTO>(`/matchstate/${matchId}`, {
            params: { side },
          });
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
  /* Server-initiated pause (injury/GK incidents/ET halftime)          */
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
    setPauseReason(p.reason); // may be 'INJURY' | 'GK_INJURY' | 'GK_RED_NEEDS_GK' | 'ET_HALF'

    if (p.player && p.player.id && p.player.name) {
      setIncidentPlayer({
        id: p.player.id,
        name: p.player.name,
        position: (p.player.position ?? "MF").toString().toUpperCase(),
        rating: p.player.rating,
      });
    } else {
      setIncidentPlayer(null);
    }

    // Align global stage (best effort)
    void setStage("HALFTIME");

    try {
      const side = p.isHomeTeam ? "home" : "away";
      const { data } = await api.get<MatchStateDTO>(`/matchstate/${p.matchId}`, {
        params: { side },
      });
      setLineup(data.lineup);
      setBench(data.bench);
      setSubsRemaining(data.subsRemaining);
    } catch {
      /* ignore */
    }
  });

  /* ---------------------------------------------------------------- */
  /* ⬇️ In-match Penalty flow                                    */
  /* ---------------------------------------------------------------- */
  useSocketEvent<PenaltyAwardedPayload>("penalty-awarded", async (p) => {
    // Only open popup if the coached team is the one taking the penalty
    const m = matches.find((x) => x.id === p.matchId);
    if (!m || !coachTeamId) return;

    const takerTeamId = p.isHome ? m.homeTeam.id : m.awayTeam.id;
    if (takerTeamId !== coachTeamId) return; // AI vs AI: ignore

    // Fetch current lineup for that side
    try {
      const side = p.isHome ? "home" : "away";
      const { data } = await api.get<MatchStateDTO>(`/matchstate/${p.matchId}`, {
        params: { side },
      });
      setPkLineup(data.lineup ?? []);
      setPkTeamName(p.isHome ? m.homeTeam.name : m.awayTeam.name);
    } catch {
      // best-effort; still allow the popup with empty list (won't render pickers)
      setPkLineup([]);
      setPkTeamName(p.isHome ? m.homeTeam.name : m.awayTeam.name);
    }

    setPkMatchId(p.matchId);
    setPkOpen(true);
  });

  // If backend emits penalty-result (it will), keep scores in sync even if popup closed
  useSocketEvent<PenaltyResultPayload>("penalty-result", (res) => {
    if (!res) return;
    if (
      typeof res.newScore?.home === "number" &&
      typeof res.newScore?.away === "number"
    ) {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === res.matchId
            ? {
                ...m,
                homeGoals: res.newScore!.home,
                awayGoals: res.newScore!.away,
              }
            : m,
        ),
      );
    }
  });

  /* ---------------------------------------------------------------- */
  /* Substitutions                                                     */
  /* ---------------------------------------------------------------- */
  const handleSub = useCallback(
    async ({ out, in: inId }: { out: number; in: number }) => {
      if (popupMatchId == null) return;

      // basic sanity checks to avoid 400s from BE validators
      const outOnPitch = lineup.some((p) => p.id === out);
      const inOnBench = bench.some((p) => p.id === inId);

      const isInjuryFlow =
        pauseReason === "INJURY" ||
        pauseReason === "GK_INJURY" ||
        pauseReason === "GK_RED_NEEDS_GK";

      if ((!outOnPitch && !isInjuryFlow) || !inOnBench) {
        console.warn("[Sub] invalid selection:", {
          out,
          inId,
          outOnPitch,
          inOnBench,
          pauseReason,
        });
        return;
      }

      if (subsRemaining <= 0) {
        console.warn("[Sub] no substitutions remaining");
        return;
      }

      const side = isHomeTeamForPopup ? "home" : "away";

      try {
        // Send a backward/forward compatible body so BE can accept either shape
        const body = {
          // old/current FE shape
          out,
          in: inId,
          isHomeTeam: isHomeTeamForPopup,
          // common BE expectations
          outPlayerId: out,
          inPlayerId: inId,
          side,
          // if your BE cares about the context (e.g., GK injury), include it
          ...(pauseReason ? { reason: pauseReason } : {}),
        };

        console.log("[Sub] POST /matchstate/%s/substitute", popupMatchId, body);
        await api.post(`/matchstate/${popupMatchId}/substitute`, body);

        // refresh authoritative match state from server
        const { data } = await api.get<MatchStateDTO>(`/matchstate/${popupMatchId}`, {
          params: { side },
        });
        setLineup(data.lineup);
        setBench(data.bench);
        setSubsRemaining(data.subsRemaining);
      } catch (e) {
        if (isAxiosError(e)) {
          console.error("[MatchDayLive] Substitution failed:", {
            status: e.response?.status,
            data: e.response?.data,
          });
        } else {
          console.error("[MatchDayLive] Substitution failed:", e);
        }
      }
    },
    [
      popupMatchId,
      isHomeTeamForPopup,
      subsRemaining,
      lineup,
      bench,
      pauseReason, // include this if it's in your component state
    ],
  );

  /* ---------------------------------------------------------------- */
  /* WebSocket live updates                                            */
  /* ---------------------------------------------------------------- */
  useSocketEvent<MatchEventDTO>("match-event", (ev) => {
    if (liveStage !== "MATCHDAY" && liveStage !== "HALFTIME") return;

    setEventsByMatch((prev) => ({
      ...prev,
      [ev.matchId]: dedupeEvents([...(prev[ev.matchId] ?? []), ev]),
    }));

    if (ev.type === "GOAL" && typeof ev.isHomeTeam === "boolean") {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== ev.matchId) return m;
          return {
            ...m,
            homeGoals: ev.isHomeTeam ? m.homeGoals + 1 : m.homeGoals,
            awayGoals: !ev.isHomeTeam ? m.awayGoals + 1 : m.awayGoals,
          };
        }),
      );
    }
  });

  useSocketEvent<MatchTickPayload>("match-tick", (live) => {
    if (liveStage !== "MATCHDAY" && liveStage !== "HALFTIME") return;

    setServerMinute((prev) => (live.minute > prev ? live.minute : prev));

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== live.matchId) return m;

        const home =
          typeof live.homeGoals === "number" ? live.homeGoals : numberProp(live, "homeScore");

        const away =
          typeof live.awayGoals === "number" ? live.awayGoals : numberProp(live, "awayScore");

        return {
          ...m,
          minute: live.minute,
          phase: live.phase ?? m.phase, // ← store the live phase for ET filtering
          homeGoals: typeof home === "number" ? home : m.homeGoals,
          awayGoals: typeof away === "number" ? away : m.awayGoals,
        };
      }),
    );

    // ⬇️ NEW: if the coached team's match enters shootout (phase === 'PENS'), go to /pk
    if (live.phase === "PENS" && typeof coachTeamId === "number") {
      const target = matches.find((mm) => mm.id === live.matchId);
      if (target && (target.homeTeam.id === coachTeamId || target.awayTeam.id === coachTeamId)) {
        navigate("/pk", { replace: true });
      }
    }
  });

  /* ---------------------------------------------------------------- */
  /* Defensive stage polling (catches missed sockets)                  */
  /* ---------------------------------------------------------------- */
  const pollTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // Only poll while the match is ongoing/paused; stop once we have RESULTS/STANDINGS
    if (liveStage === "RESULTS" || liveStage === "STANDINGS") {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Don’t start before we know the save id
    if (effectiveSaveId == null) return;

    if (pollTimerRef.current) return; // already polling

    pollTimerRef.current = window.setInterval(async () => {
      try {
        const { data } = await api.get<GameStateDTO>("/gamestate");
        if (!data?.gameStage) return;

        if (data.gameStage === "PENALTIES") {
          // Be robust if socket missed: navigate to PK screen
          navigate("/pk", { replace: true });
        } else if (
          data.gameStage === "RESULTS" ||
          data.gameStage === "STANDINGS"
        ) {
          console.log("[Live] poll detected stage →", data.gameStage);
          setLiveStage(data.gameStage);
        }
      } catch {
        /* ignore */
      }
    }, 1000);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [effectiveSaveId, liveStage, navigate]);

  /* ---------------------------------------------------------------- */
  /* RESULTS/STANDINGS → navigate (one-shot, robust, server-authoritative) */
  /* ---------------------------------------------------------------- */
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (hasNavigatedRef.current) return;

    const isDone = liveStage === "RESULTS" || liveStage === "STANDINGS";
    if (!isDone) return;

    (async () => {
      // Default to store value, but prefer the server's current matchdayType
      let resolvedType: GameStateDTO["matchdayType"] | null = null;
      try {
        const { data } = await api.get<GameStateDTO>("/gamestate");
        if (data && data.matchdayType) resolvedType = data.matchdayType;
      } catch {
        /* ignore; fall back to store */
      }

      const typeToUse = resolvedType ?? matchdayType;
      const to = typeToUse === "CUP" ? cupUrl : standingsUrl;

      console.log("[Live] Stage done → navigating now (resolved):", {
        liveStage,
        to,
        typeToUse,
        storeMatchdayType: matchdayType,
      });

      hasNavigatedRef.current = true;
      navigate(to, { replace: true, state: { cameFromResults: true } });
    })();
  }, [liveStage, matchdayType, navigate]);

  /* ---------------------------------------------------------------- */
  /* Common resume handler (used by all popups)                        */
  /* ---------------------------------------------------------------- */
  const resumeMatch = useCallback(async () => {
    try {
      // If the engine already finished, jump out instead of forcing MATCHDAY
      if (liveStage === "RESULTS" || liveStage === "STANDINGS") {
        const to = matchdayType === "LEAGUE" ? standingsUrl : cupUrl;
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate(to, { replace: true, state: { cameFromResults: true } });
        }
        return;
      }

      // Unpause the currently opened match (server-side) if we have one
      if (popupMatchId != null) {
        try {
          await api.post(`/matchstate/${popupMatchId}/pause`, { isPaused: false });
        } catch (e) {
          console.warn("[Live] unpause request failed", e);
        }
      }

      // Return the global stage to MATCHDAY
      await setStage("MATCHDAY");
    } catch (e) {
      console.warn("[MatchDayLive] Failed to resume MATCHDAY:", e);
    } finally {
      setPopupMatchId(null);
      setPauseReason(null);
      setIncidentPlayer(null);
    }
  }, [liveStage, matchdayType, navigate, popupMatchId, setStage]);

  /* ---------------------------------------------------------------- */
  /* HOOK ORDER SAFE: compute memos BEFORE any early returns           */
  /* ---------------------------------------------------------------- */

  // ⬇️ FIX: consider minute-based ET as well, so we don't hide concurrent ET games
  const isET = (m: MatchDTO) => {
    const minute = typeof m.minute === "number" ? m.minute : 0;
    return m.phase === "ET" || (minute >= 91 && minute <= 120);
  };

  const visibleMatches: MatchDTO[] = useMemo(() => {
    const anyET = matches.some(isET);
    return anyET ? matches.filter(isET) : matches;
  }, [matches]);

  const tickerGames: TickerGame[] = useMemo(() => {
    return visibleMatches.map((m) => ({
      id: m.id,
      division: m.division,
      minute: m.minute ?? 0,
      home: { id: m.homeTeam.id, name: m.homeTeam.name, score: m.homeGoals },
      away: { id: m.awayTeam.id, name: m.awayTeam.name, score: m.awayGoals },
      events: (eventsByMatch[m.id] ?? []).slice(-1).map((ev) => ({
        minute: ev.minute,
        type: ev.type,
        text: ev.description,
      })),
      // We don't pass 'phase' into TickerGame to avoid changing its type;
      // filtering is already done via visibleMatches above.
    }));
  }, [visibleMatches, eventsByMatch]);

  const popupEvents: MatchEvent[] = useMemo(() => {
    if (popupMatchId == null) return [];
    return (eventsByMatch[popupMatchId] ?? []).map((ev, i) => ({
      id: ev.id ?? i,
      minute: ev.minute,
      text: ev.description,
    }));
  }, [eventsByMatch, popupMatchId]);

  const canSubstitute = useMemo(() => {
    if (popupMatchId == null || coachTeamId == null) return false;
    const match = matches.find((m) => m.id === popupMatchId);
    if (!match) return false;
    const isCoachSide =
      match.homeTeam.id === coachTeamId || match.awayTeam.id === coachTeamId;
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
  /* Main render                                                       */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-green-900 p-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {`Matchday ${currentMatchday} - ${isCupDay ? "Cup" : "League"}`}
        </h1>
        <div className="rounded-xl bg-white/10 px-4 py-2 text-lg font-semibold tabular-nums">
          {serverMinute}'
        </div>
      </div>

      <AppCard variant="outline" className="bg-white/10 p-4">
        <MatchTicker
          games={tickerGames}
          /* ----------------------------------------------------------
           * Clicking the whole game row: pause ALL games, open HOME by default
           * ---------------------------------------------------------- */
          onGameClick={async (id) => {
            const numId = Number(id);
            if (teamClickLockRef.current) return;
            teamClickLockRef.current = true;

            try {
              setPauseReason("COACH_PAUSE");
              setIncidentPlayer(null);
              setIsHomeTeamForPopup(true); // default side when row (not team) is clicked

              // Pause everything, then flip global stage to HALFTIME
              await pauseAllMatches();
              await setStage("HALFTIME");

              // Fetch the (default) home side’s state and open
              const { data } = await api.get<MatchStateDTO>(`/matchstate/${numId}`, {
                params: { side: "home" },
              });
              setLineup(data.lineup);
              setBench(data.bench);
              setSubsRemaining(data.subsRemaining);
              setPopupMatchId(numId);
            } finally {
              teamClickLockRef.current = false;
            }
          }}
          /* ----------------------------------------------------------
           * Clicking a specific team: pause ALL games, open that side
           * ---------------------------------------------------------- */
          onTeamClick={async ({ matchId, isHome }) => {
            if (teamClickLockRef.current) return;
            teamClickLockRef.current = true;

            setIsHomeTeamForPopup(isHome);
            setPauseReason("COACH_PAUSE");
            setIncidentPlayer(null);

            try {
              // Pause everything (engine-wide), then set global HALFTIME
              await pauseAllMatches();
              await setStage("HALFTIME");

              const side: "home" | "away" = isHome ? "home" : "away";
              const { data } = await api.get<MatchStateDTO>(`/matchstate/${matchId}`, {
                params: { side },
              });

              setLineup(data.lineup);
              setBench(data.bench);
              setSubsRemaining(data.subsRemaining);

              // Open after we have data (prevents brief empty-state modal)
              setPopupMatchId(matchId);
            } finally {
              teamClickLockRef.current = false;
            }
          }}
          showMinute={false}
          groupByDivision={!isCupDay}
        />
      </AppCard>

      {popupMatchId !== null && (
        <>
          {pauseReason === "GK_RED_NEEDS_GK" ? (
            <GKRedPopup
              key={`popup-gkred-${popupMatchId}`}
              open
              lineup={lineup}
              bench={bench}
              subsRemaining={subsRemaining}
              isHomeTeam={isHomeTeamForPopup}
              onConfirmSub={async ({ out, in: inId }) => {
                await handleSub({ out, in: inId });
                await resumeMatch();
              }}
              onResume={resumeMatch}
              title="Goalkeeper Sent Off"
              confirmLabel="Confirm substitution"
              resumeLabel="Resume match"
            />
          ) : pauseReason === "INJURY" || pauseReason === "GK_INJURY" ? (
            <InjuryPopup
              key={`popup-injury-${popupMatchId}-${incidentPlayer?.id ?? "x"}`}
              open
              injured={incidentPlayer!}
              lineup={lineup}
              bench={bench}
              subsRemaining={subsRemaining}
              isHomeTeam={isHomeTeamForPopup}
              onConfirmSub={async ({ out, in: inId }) => {
                // normal “confirm” → swap injured with chosen reserve, then resume
                await handleSub({ out, in: inId });
                await resumeMatch();
              }}
              onResumeNoSub={async (injuredId) => {
                if (popupMatchId == null) return;
                try {
                  // remove injured from lineup (no sub), then unpause & resume
                  await api.post(`/matchstate/${popupMatchId}/remove-player`, {
                    playerId: injuredId,
                    isHomeTeam: isHomeTeamForPopup,
                  });
                } catch (e) {
                  console.warn(
                    "[Live] remove-player failed (resume no sub):",
                    e,
                  );
                }
                await resumeMatch();
              }}
              title="Player Injured"
              confirmLabel="Confirm substitution"
              resumeLabel="Resume match"
            />
          ) : (
            <HalfTimePopup
              key={`popup-halftime-${popupMatchId}`}
              open
              onClose={resumeMatch}
              events={popupEvents}
              lineup={lineup}
              bench={bench}
              subsRemaining={subsRemaining}
              onSubstitute={handleSub}
              canSubstitute={canSubstitute}
              // Pass pauseReason through — HalfTimePopup can label ET vs normal HT
              pauseReason={pauseReason ?? undefined}
            />
          )}
        </>
      )}

      {/* ⬇️ In-match Penalty popup (independent from halftime popups) */}
      {pkOpen && pkMatchId != null && typeof effectiveSaveId === "number" && (
        <PenaltyKickPopup
          open
          saveGameId={effectiveSaveId}
          matchId={pkMatchId}
          lineup={mapToPlayerLite(pkLineup)}
          teamName={pkTeamName}
          allowGK={false}
          onResolved={(res) => {
            if (res.newScore) {
              setMatches((prev) =>
                prev.map((m) =>
                  m.id === pkMatchId
                    ? {
                        ...m,
                        homeGoals: res.newScore!.home,
                        awayGoals: res.newScore!.away,
                      }
                    : m,
                ),
              );
            }
          }}
          onClose={() => {
            setPkOpen(false);
            setPkMatchId(null);
            setPkLineup([]);
          }}
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
    const key =
      ev.id != null
        ? `id:${ev.id}`
        : `m:${ev.matchId}|t:${ev.minute}|d:${ev.description}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(ev);
    }
  }
  return out;
}

function sortUserMatchFirst<
  T extends { homeTeam: { id: number }; awayTeam: { id: number } },
>(fixtures: T[], coachTeamId?: number | null): T[] {
  if (!coachTeamId) return fixtures;
  const idx = fixtures.findIndex(
    (m) => m.homeTeam.id === coachTeamId || m.awayTeam.id === coachTeamId,
  );
  if (idx <= 0) return fixtures;
  const user = fixtures[idx];
  return [user, ...fixtures.slice(0, idx), ...fixtures.slice(idx + 1)];
}
