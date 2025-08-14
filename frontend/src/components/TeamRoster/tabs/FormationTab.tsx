// frontend/src/components/TeamRoster/tabs/FormationTab.tsx

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/axios";
import { useGameState, type GameStage } from "@/store/GameStateStore";

/** Keep aligned with backend-supported options */
const FORMATION_OPTIONS = [
  "4-4-2",
  "4-3-3",
  "4-2-3-1",
  "3-5-2",
  "5-3-2",
  "3-4-3",
] as const;

type Formation = (typeof FORMATION_OPTIONS)[number];

interface GameStateResp {
  id: number;
  season: number;
  currentMatchday: number | null;
  coachTeamId: number | null;
  currentSaveGameId?: number | null;
  matchdayType: "LEAGUE" | "CUP";
  gameStage: GameStage | string;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export default function FormationTab() {
  const navigate = useNavigate();

  // ✅ Single source of truth: read/write everything from the store
  const {
    saveGameId,
    coachTeamId,
    refreshGameState,
    setGameStage,
    setSaveGameId,
    setCoachTeamId,
  } = useGameState();

  const [formation, setFormation] = useState<Formation>("4-4-2");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    // Log baseURL to verify which backend this tab is talking to
    const baseURL: string | undefined = (api.defaults as { baseURL?: string }).baseURL;
    console.log("[FormationTab] axios baseURL:", baseURL ?? "(none)");

    // Populate store on mount (safe even if provider autoloads)
    (async () => {
      try {
        await refreshGameState();
      } catch (e) {
        console.warn("[FormationTab] Failed to refresh game state on mount", e);
      }
    })();
  }, [refreshGameState]);

  const options = useMemo(() => FORMATION_OPTIONS, []);

  const handleFormationChange = (next: Formation) => {
    setFormation(next);
    console.log("[FormationTab] Formation changed ->", { formation: next });
  };

  async function startMatchSafely(id: number): Promise<boolean> {
    console.log("[FormationTab] ▶️ startMatchSafely(saveGameId)", {
      saveGameId: id,
      typeof: typeof id,
    });

    // 1) Try explicit stage flip
    try {
      console.log(
        "[FormationTab] POST /matchday/set-stage { saveGameId, stage: 'MATCHDAY' }",
        { saveGameId: id }
      );
      const { data } = await api.post<{ gameStage: string }>("/matchday/set-stage", {
        saveGameId: id,
        stage: "MATCHDAY",
      });
      console.log("[FormationTab] ✅ set-stage success ->", data);
      return true;
    } catch (err) {
      console.warn(
        "[FormationTab] /matchday/set-stage failed; falling back to /matchday/advance",
        err
      );
    }

    // 2) Fallback to background simulation flow
    try {
      console.log("[FormationTab] POST /matchday/advance { saveGameId }", {
        saveGameId: id,
      });
      const { data } = await api.post("/matchday/advance", { saveGameId: id });
      console.log("[FormationTab] ✅ advance responded ->", data);
      return true;
    } catch (err) {
      console.error("[FormationTab] ❌ advance failed:", err);
      return false;
    }
  }

  // 🔁 Poll backend and write **directly into the store** each iteration
  async function confirmBackendStage(
    expected: GameStage,
    tries = 10,
    delayMs = 200
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= tries; attempt++) {
      const { data: gs } = await api.get<GameStateResp>("/gamestate");

      // Push fresh values to the store so any guards read the latest state
      try {
        setGameStage(((gs.gameStage as GameStage) ?? "ACTION"));
        setSaveGameId(typeof gs.currentSaveGameId === "number" ? gs.currentSaveGameId : null);
        setCoachTeamId(gs.coachTeamId ?? null);
      } catch (e) {
        console.warn("[FormationTab] pushToStore failed (ignored):", e);
      }

      console.log(`[FormationTab] Poll #${attempt} /gamestate ->`, gs.gameStage);
      if (gs.gameStage === expected) return true;
      await sleep(delayMs);
    }
    return false;
  }

  const handleAdvance = async () => {
    setErrMsg(null);

    if (typeof saveGameId !== "number" || Number.isNaN(saveGameId)) {
      setErrMsg("Missing saveGameId. Try reloading.");
      console.warn("[FormationTab] Cannot advance: saveGameId is invalid", { saveGameId });
      return;
    }

    setLoading(true);
    try {
      // If you have a formation-persist endpoint, you can enable this:
      // await api.post("/matchstate/set-formation", {
      //   saveGameId,
      //   teamId: coachTeamId,
      //   formation,
      // });

      const ok = await startMatchSafely(saveGameId);
      if (!ok) {
        setErrMsg("Failed to start matchday. Check backend logs.");
        return;
      }

      // Confirm the backend flipped to MATCHDAY before navigating
      const confirmed = await confirmBackendStage("MATCHDAY", 10, 200);
      if (!confirmed) {
        setErrMsg(
          "Stage didn’t change to MATCHDAY on the backend. You may be hitting a different server."
        );
        return;
      }

      console.log("[FormationTab] 🚀 Navigating to /matchday");
      navigate("/matchday");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <label className="text-sm font-medium text-white/80">Formation</label>

      <select
        className="rounded-lg border border-white/10 bg-white/10 p-2 text-white outline-none ring-0"
        value={formation}
        onChange={(e) => handleFormationChange(e.target.value as Formation)}
        disabled={loading}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleAdvance}
        disabled={loading || !saveGameId}
        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Starting…" : "Go to Matchday Live"}
      </button>

      {errMsg && <div className="text-sm text-red-300">{errMsg}</div>}

      <div className="text-xs text-white/50">
        {typeof saveGameId === "number" ? `SaveGame #${saveGameId}` : "SaveGame: unknown"} •{" "}
        {typeof coachTeamId === "number" ? `Team #${coachTeamId}` : "Team: unknown"}
      </div>
    </div>
  );
}
