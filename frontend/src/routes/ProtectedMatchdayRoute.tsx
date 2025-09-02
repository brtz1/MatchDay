import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useGameState } from "@/store/GameStateStore";
import api from "@/services/axios";

type GameStage = "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS";

type Props = { children: ReactNode };

/**
 * Route guard that:
 * - Waits to resolve save id (from store or /gamestate) before deciding.
 * - Allows MATCHDAY, HALFTIME, RESULTS.
 * - Gives a short grace window (up to 3s) to let ACTION → MATCHDAY flip.
 * - Never sends you to Title unless we are 100% sure there is NO save.
 */
export default function ProtectedMatchdayRoute({ children }: Props) {
  const nav = useNavigate();
  const { state } = useLocation();
  const {
    gameStage,
    coachTeamId,
    saveGameId,
    currentSaveGameId,
  } = useGameState();

  // resolve save id once
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
        const { data } = await api.get<{ currentSaveGameId: number | null }>("/gamestate");
        if (!cancelled) setResolvedSaveId(data.currentSaveGameId ?? null);
      } catch {
        if (!cancelled) setResolvedSaveId(undefined); // unknown → do not redirect
      }
    })();
    return () => { cancelled = true; };
  }, [storeSaveId]);

  const allowed = useMemo(
    () => new Set<GameStage>(["MATCHDAY", "HALFTIME", "RESULTS"]),
    []
  );

  // Give the server time to flip into MATCHDAY after you click the button
  const [graceActive, setGraceActive] = useState(false);
  const graceTimer = useRef<number | null>(null);

  // Start grace when we arrive here with a hint we came from Formation
  useEffect(() => {
    const hinted = Boolean((state as any)?.fromFormation);
    if (!hinted || graceActive) return;
    setGraceActive(true);
    graceTimer.current = window.setTimeout(() => setGraceActive(false), 3000);
    return () => {
      if (graceTimer.current) window.clearTimeout(graceTimer.current);
    };
  }, [state, graceActive]);

  // Decide what to do
  // 1) Unknown save id? show nothing (let child render a loader)
  if (resolvedSaveId === undefined) return <>{children}</>;

  // 2) Definitely no save → Title
  if (resolvedSaveId === null) return <Navigate to="/" replace />;

  // 3) Known save: accept allowed stages; during grace, also accept ACTION
  if (gameStage && (allowed.has(gameStage) || (graceActive && gameStage === "ACTION"))) {
    return <>{children}</>;
  }

  // 4) If stage isn’t allowed and no grace, send to the team page (not Title)
  if (coachTeamId != null) {
    return <Navigate to={`/team/${coachTeamId}`} replace />;
  }
  return <Navigate to="/" replace />;
}
