import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameState } from "@/store/GameStateStore";

/** Keep this union in sync with backend GameStage enum */
export type Stage =
  | "ACTION"
  | "MATCHDAY"
  | "HALFTIME"
  | "RESULTS"
  | "STANDINGS";

type Options = {
  redirectTo?: string;
  graceMs?: number; // delay before redirect, useful during stage transitions
};

/**
 * Guard a page so it only shows when gameStage matches one of the required stages.
 * Accepts a single Stage or an array of allowed Stage values.
 */
export function useRequiredStage(required: Stage | Stage[], options?: Options) {
  const navigate = useNavigate();
  const { gameStage, bootstrapping } = useGameState();

  useEffect(() => {
    if (bootstrapping) return;

    const allowed: Stage[] = Array.isArray(required) ? required : [required];

    if (!allowed.includes(gameStage as Stage)) {
      const to = options?.redirectTo ?? "/";
      const delay = options?.graceMs ?? 0;

      if (delay > 0) {
        const t = setTimeout(() => navigate(to), delay);
        return () => clearTimeout(t);
      } else {
        navigate(to);
      }
    }
  }, [bootstrapping, gameStage, navigate, required, options?.redirectTo, options?.graceMs]);
}

export default useRequiredStage;
