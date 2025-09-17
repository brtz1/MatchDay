// frontend/src/components/TeamRoster/tabs/FormationTab.tsx

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/axios";
import { useGameState, type MinimalPlayer } from "@/store/GameStateStore";
import { advanceToMatchday } from "@/services/matchService";
import { postCoachFormation } from "@/services/axios";
import { FORMATION_LAYOUTS } from "@/utils/formationHelper";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
type Formation = keyof typeof FORMATION_LAYOUTS;

type Player = {
  id: number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function hasExactlyOneGK(selectedIds: number[], players: Player[]) {
  const set = new Set(selectedIds);
  const gks = players.filter((p) => set.has(p.id) && p.position === "GK");
  return gks.length === 1;
}

/** Derive DF-MF-AT from the 10 outfielders in the lineup. GK must be exactly 1. */
function deriveFormationFromLineup(lineupIds: number[], players: Player[]): string {
  const set = new Set(lineupIds);
  let df = 0, mf = 0, at = 0, gk = 0;

  for (const p of players) {
    if (!set.has(p.id)) continue;
    if (p.position === "GK") gk += 1;
    else if (p.position === "DF") df += 1;
    else if (p.position === "MF") mf += 1;
    else if (p.position === "AT") at += 1;
  }
  // We only encode the outfield split; GK is implicitly 1 by validation.
  // If GK isn’t 1 for some reason, it won’t block posting but FE validates before.
  return `${df}-${mf}-${at}`;
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

    selectedFormation,
    setSelectedFormation,
    lineupIds,
    reserveIds,
    autopickSelection,
    reserveLimit,
  } = useGameState();

  // Options come from canonical layouts to avoid FE/FE drift
  const FORMATION_OPTIONS = useMemo(
    () => Object.keys(FORMATION_LAYOUTS) as Formation[],
    []
  );

  // Normalize unknowns to first option
  const normalized: Formation = (FORMATION_OPTIONS as readonly string[]).includes(selectedFormation)
    ? (selectedFormation as Formation)
    : (FORMATION_OPTIONS[0] as Formation);

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

    // Ensure the store always has a valid formation immediately
    const isValid = (f?: string) =>
      !!f && (FORMATION_OPTIONS as readonly string[]).includes(f as any);

    if (!isValid(selectedFormation)) {
      setSelectedFormation(FORMATION_OPTIONS[0]); // push default into the store
      setFormation(FORMATION_OPTIONS[0]);         // keep local state in sync
    } else {
      setFormation(selectedFormation as Formation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Change the suggestion ONLY; do not auto-reshape existing XI. */
  const handleFormationChange = (next: Formation) => {
    setFormation(next);
    setSelectedFormation(next);
  };

  /** Explicit button to apply suggestion → auto-pick. */
  const handleApplySuggestion = () => {
    const compact: MinimalPlayer[] = players.map((p) => ({
      id: p.id,
      position: p.position,
      rating: p.rating,
    }));
    autopickSelection(compact, formation);
  };

  /** Validate only on CTA click (UI can temporarily exceed). */
  function validateSelection(): string | null {
    if (lineupIds.length !== 11) {
      return `Your lineup must have exactly 11 players (currently ${lineupIds.length}).`;
    }
    if (!hasExactlyOneGK(lineupIds, players)) {
      return "Your lineup must include exactly 1 Goalkeeper.";
    }
    if (reserveIds.length > reserveLimit) {
      return `Your reserves exceed the limit (${reserveIds.length}/${reserveLimit}). Reduce the bench before continuing.`;
    }

    // sanity: no overlap / duplicates
    const lu = new Set(lineupIds);
    if (reserveIds.some((id) => lu.has(id))) {
      return "A player cannot be in both Lineup and Reserves.";
    }
    if (new Set(lineupIds).size !== lineupIds.length) {
      return "Duplicate players detected in Lineup.";
    }
    if (new Set(reserveIds).size !== reserveIds.length) {
      return "Duplicate players detected in Reserves.";
    }
    return null;
  }

  const handleAdvance = async () => {
    setErrMsg(null);

    if (typeof saveGameId !== "number" || Number.isNaN(saveGameId)) {
      setErrMsg("Missing saveGameId. Try reloading.");
      return;
    }
    if (typeof coachTeamId !== "number" || Number.isNaN(coachTeamId)) {
      setErrMsg("Missing coachTeamId. Try reloading.");
      return;
    }

    const v = validateSelection();
    if (v) {
      setErrMsg(v);
      return;
    }

    const effectiveFormation = deriveFormationFromLineup(lineupIds, players);

    setLoading(true);
    try {
      // 1) Persist the CONFIRMED XI “as-is” (no server auto-balance)
      console.log("[FormationTab] POST /formation/coach", {
        saveGameId,
        teamId: coachTeamId,
        lineupIds,
        reserveIds,
        formation: effectiveFormation,
      });
      await postCoachFormation({
        saveGameId,
        teamId: coachTeamId,
        lineupIds,
        reserveIds,
        formation: effectiveFormation,
      });

      // 2) Start the engine via /matchday/advance
      console.log("[FormationTab] POST /matchday/advance", { saveGameId });
      await advanceToMatchday(saveGameId);

      // Navigate immediately; Live page listens to sockets / stage
      navigate("/matchday", { state: { fromFormation: true } });
    } catch (e) {
      console.error("[FormationTab] ❌ advance flow failed:", e);
      setErrMsg("Could not save selection and start matchday. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <label className="text-sm font-medium text-white/80">Suggested Formation</label>

      <div className="flex items-center gap-2">
        <select
          className="rounded-lg border border-gray-300 bg-white p-2 text-black outline-none ring-0"
          value={formation}
          onChange={(e) => handleFormationChange(e.target.value as Formation)}
          disabled={loading}
        >
          {FORMATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleApplySuggestion}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          title="Auto-pick lineup & bench according to the suggested shape"
        >
          Apply suggestion
        </button>
      </div>

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
        Lineup {lineupIds.length}/11 • Reserves {reserveIds.length}/{reserveLimit}
      </div>
    </div>
  );
}
