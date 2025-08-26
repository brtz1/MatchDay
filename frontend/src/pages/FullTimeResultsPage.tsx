// frontend/src/pages/FullTimeResultsPage.tsx

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import api, {
  getGameState,
  getResultsByMatchday,
  getMatchesByMatchday,
  setStage,
  type MatchDTO,
  type GameStateDTO,
} from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { useRequiredStage } from "@/hooks/useRequiredStage";

/**
 * Full-Time Results page
 * Flow expectation:
 *   Live (freeze 5s) → Results (this page) → [Proceed] → Standings (auto-close ~30s) → Team Roster (ACTION)
 */
export default function FullTimeResultsPage() {
  useRequiredStage("RESULTS", { redirectTo: "/", graceMs: 1000 });

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // 1) Read current matchday from backend (authoritative)
      const gs: GameStateDTO = await getGameState();
      const md = gs.currentMatchday;

      // 2) Try results summary endpoint first; fallback to fetching matches-by-matchday
      try {
        const summary = await getResultsByMatchday(md);
        setMatches(summary.matches ?? []);
      } catch {
        const list = await getMatchesByMatchday(md);
        setMatches(list ?? []);
      }
    } catch (e) {
      console.error("[Results] Failed to load results:", e);
      setErr("Failed to load full-time results.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const handleProceed = useCallback(async () => {
    try {
      const gs = await getGameState();
      const saveGameId = gs.currentSaveGameId ?? undefined;

      // Prefer the dedicated route if you have it (does stage flip + any post-processing)
      if (typeof saveGameId === "number") {
        try {
          await api.post("/matchday/advance-after-results", { saveGameId });
        } catch (e) {
          // Fallback: explicitly set stage to STANDINGS if route isn't available
          await setStage({ saveGameId, stage: "STANDINGS" });
        }
      }

      navigate("/standings");
    } catch (e) {
      console.error("❌ Failed to proceed from results:", e);
      setErr("Could not proceed to standings. Try again.");
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-900 text-white">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-green-900 p-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Full-Time Results</h1>
        <div className="text-sm opacity-80">Tap “Proceed” to view standings</div>
      </div>

      {err && (
        <div className="rounded-md bg-red-600/20 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <AppCard variant="outline" className="bg-white/10 p-4">
        {matches.length === 0 ? (
          <div className="text-white/80">No results available.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between border-b border-white/15 pb-1 last:border-b-0"
              >
                <div className="text-xs uppercase tracking-wide opacity-70">
                  {m.division}
                </div>
                <div className="text-sm tabular-nums">
                  {m.homeTeam.name} <strong>{m.homeGoals}</strong> x{" "}
                  <strong>{m.awayGoals}</strong> {m.awayTeam.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <div className="mt-4 self-end">
        <AppButton onClick={handleProceed}>Proceed</AppButton>
      </div>
    </div>
  );
}
