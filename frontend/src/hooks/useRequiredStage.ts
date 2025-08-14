import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGameState } from "@/store/GameStateStore";

type Stage = "ACTION" | "MATCHDAY" | "TRANSFER" | "OFFSEASON";

type Options = {
  redirectTo?: string;
  graceMs?: number;     // how long to wait after mount *once bootstrapping is done*
  debug?: boolean;
};

/**
 * Keep user on the page if gameStage matches one of `required`.
 * If not, wait until bootstrapping is done, then start a timer.
 * Only redirect if, after `graceMs`, stage still doesn't match.
 * The timer cancels automatically when stage flips to a valid value.
 */
export function useRequiredStage(required: Stage | Stage[], opts: Options = {}) {
  const requiredSet = useRef(new Set(Array.isArray(required) ? required : [required])).current;
  const { gameStage, bootstrapping } = useGameState();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = opts.redirectTo ?? "/";
  const graceMs = opts.graceMs ?? 6000;
  const redirected = useRef(false);

  useEffect(() => {
    const ok = requiredSet.has(gameStage as Stage);

    // While store is loading or we're already OK, never schedule a redirect.
    if (bootstrapping || ok) {
      if (opts.debug) {
        console.log("[useRequiredStage] HOLD", { bootstrapping, ok, gameStage, path: location.pathname });
      }
      return;
    }

    // Not bootstrapping and not OK -> arm a timer.
    const t = window.setTimeout(() => {
      const stillNotOk = !requiredSet.has(gameStage as Stage);
      if (stillNotOk && !redirected.current) {
        redirected.current = true;
        if (opts.debug) {
          console.log("[useRequiredStage] REDIRECT", { from: location.pathname, to: redirectTo, gameStage });
        }
        navigate(redirectTo, { replace: true });
      }
    }, graceMs);

    // If gameStage changes (e.g., flips to MATCHDAY), this cleanup cancels the redirect.
    return () => clearTimeout(t);
  }, [gameStage, bootstrapping, graceMs, redirectTo, navigate, location.pathname, opts.debug, requiredSet]);
}
