// frontend/src/components/TeamRoster/tabs/FormationTab.tsx

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/axios";
import { useGameState, type GameStage, type MinimalPlayer } from "@/store/GameStateStore";

/** Supported options (❌ 4-2-3-1 removed) */
const FORMATION_OPTIONS = [
  "4-4-2",
  "4-3-3",
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

type Player = {
  id: number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

interface Props {
  players: Player[];
}

export default function FormationTab({ players }: Props) {
  const navigate = useNavigate();

  const {
    saveGameId,
    coachTeamId,
    refreshGameState,
    setGameStage,
    setSaveGameId,
    setCoachTeamId,

    selectedFormation,
    setSelectedFormation,
    lineupIds,
    reserveIds,
    autopickSelection,
  } = useGameState();

  // If store holds an unsupported formation, normalize to 4-4-2
  const normalized = (FORMATION_OPTIONS as readonly string[]).includes(selectedFormation)
    ? (selectedFormation as Formation)
    : "4-4-2";

  const [formation, setFormation] = useState<Formation>(normalized);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const baseURL: string | undefined = (api.defaults as { baseURL?: string }).baseURL;
    console.log("[FormationTab] axios baseURL:", baseURL ?? "(none)");

    (async () => {
      try {
        await refreshGameState();
      } catch (e) {
        console.warn("[FormationTab] Failed to refresh game state on mount", e);
      }
    })();

    if (formation !== normalized) {
      setFormation(normalized);
      setSelectedFormation(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => FORMATION_OPTIONS, []);

  const handleFormationChange = (next: Formation) => {
    setFormation(next);
    setSelectedFormation(next);

    // Visual-only autopick (no cross-fill; enforced in store)
    const compact: MinimalPlayer[] = players.map(p => ({
      id: p.id,
      position: p.position,
      rating: p.rating,
    }));
    autopickSelection(compact, next);
  };

  async function startMatchWithSelection(id: number): Promise<boolean> {
    try {
      // Your FE service persists coach selection first (see FE-matchService.ts below)
      // Then we advance stage.
      const payload = { saveGameId: id, formation, lineupIds, reserveIds };
      console.log("[FormationTab] POST /matchday/advance", payload);
      const { data } = await api.post<{ gameStage: string }>("/matchday/advance", payload);
      console.log("[FormationTab] ✅ advance responded ->", data);
      return true;
    } catch (err) {
      console.error("[FormationTab] ❌ advance failed:", err);
      return false;
    }
  }

  async function confirmBackendStage(expected: GameStage, tries = 10, delayMs = 200) {
    for (let attempt = 1; attempt <= tries; attempt++) {
      const { data: gs } = await api.get<GameStateResp>("/gamestate");
      try {
        setGameStage(((gs.gameStage as GameStage) ?? "ACTION"));
        setSaveGameId(typeof gs.currentSaveGameId === "number" ? gs.currentSaveGameId : null);
        setCoachTeamId(gs.coachTeamId ?? null);
      } catch (e) {
        console.warn("[FormationTab] pushToStore failed (ignored):", e);
      }
      if (gs.gameStage === expected) return true;
      await sleep(delayMs);
    }
    return false;
  }

  function hasExactlyOneGK(selected: number[]) {
    const set = new Set(selected);
    const gks = players.filter(p => set.has(p.id) && p.position === "GK");
    return gks.length === 1;
  }

  const handleAdvance = async () => {
  setErrMsg(null);
  if (typeof saveGameId !== "number" || Number.isNaN(saveGameId)) {
    setErrMsg("Missing saveGameId. Try reloading.");
    return;
  }
  if (lineupIds.length !== 11) {
    setErrMsg("Your lineup must have exactly 11 players.");
    return;
  }
  if (!hasExactlyOneGK(lineupIds)) {
    setErrMsg("Your lineup must include exactly 1 Goalkeeper.");
    return;
  }

  setLoading(true);
  try {
    const ok = await startMatchWithSelection(saveGameId);
    if (!ok) {
      setErrMsg("Failed to start matchday. Check backend logs.");
      return;
    }

    // Wait a moment for the server to flip, then confirm.
    const confirmed = await confirmBackendStage("MATCHDAY", 10, 200);
    if (!confirmed) {
      setErrMsg("Stage didn’t change to MATCHDAY on the backend.");
      return;
    }

    // Ensure the store is fresh BEFORE navigating.
    // (import { useGameState } ... then get refreshGameState from it)
    await refreshGameState?.();

    navigate("/matchday", { state: { fromFormation: true } });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <label className="text-sm font-medium text-white/80">Formation</label>

      {/* readable dropdown: black text on white */}
      <select
        className="rounded-lg border border-gray-300 bg-white p-2 text-black outline-none ring-0"
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
        {typeof coachTeamId === "number" ? `Team #${coachTeamId}` : "Team: unknown"} •{" "}
        Lineup {lineupIds.length}/11
      </div>
    </div>
  );
}
