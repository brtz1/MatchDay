import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";

import { teamUrl, titlePageUrl, newGameUrl } from "@/utils/paths";

/* ── Types ─────────────────────────────────────────────────────────── */
interface SaveGame {
  id: number;
  name: string;
  coachName: string;
  createdAt: string;
  teams: { id: number; name: string; division: string }[];
}

interface LoadResponse {
  coachTeamId: number;
}

/* ── Component ─────────────────────────────────────────────────────── */
export default function LoadGamePage() {
  const navigate = useNavigate();
  const { setCurrentTeamId, setCurrentSaveGameId } = useTeamContext();
  const { refreshGameState } = useGameState();

  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    axios
      .get<SaveGame[]>("/save-game", { params: { includeTeams: true } })
      .then(({ data }) => {
        // ensure we always end up with an array
        if (Array.isArray(data)) {
          setSaves(data);
        } else {
          console.warn("Unexpected save-game payload:", data);
          setSaves([]);
        }
      })
      .catch(() => {
        setError("Could not load saved games.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleLoad(saveGameId: number, saveName: string) {
    if (
      !window.confirm(
        `Load save "${saveName}"?\nUnsaved progress will be lost.`
      )
    )
      return;

    setLoadingId(saveGameId);
    setError(null);

    try {
      // mark this save as active
      await axios.post(`/gamestate/set-save/${saveGameId}`);

      // fetch coachTeamId
      const { data } = await axios.post<LoadResponse>(
        "/save-game/load",
        { id: saveGameId }
      );

      if (!data.coachTeamId) {
        throw new Error("Missing coach team ID from save");
      }

      setCurrentSaveGameId(saveGameId);
      setCurrentTeamId(data.coachTeamId);

      // refresh the global GameState
      await refreshGameState();

      navigate(teamUrl(data.coachTeamId));
    } catch (err) {
      console.error(err);
      setError("Failed to load save game.");
      setLoadingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-green-900 px-4 py-12 text-white">
      <h1 className="text-4xl font-bold">Load Save-Game</h1>

      {/* loader / error / empty list / cards */}
      {loading ? (
        <p className="text-xl">Loading saved games…</p>
      ) : error ? (
        <p className="font-semibold text-red-400">{error}</p>
      ) : saves.length === 0 ? (
        <p className="text-gray-200">
          No saves found. Start a new game to begin!
        </p>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
          {saves.map((save) => {
            // we’ll treat the first team in the list as the “coach team”
            const coachTeam = save.teams[0];

            return (
              <AppCard
                key={save.id}
                variant="outline"
                className="flex items-center justify-between bg-white/10"
              >
                <div>
                  <p className="text-xl font-semibold">{save.name}</p>
                  <p className="text-sm text-gray-300">
                    Coach: {save.coachName || "Unknown"} — Team:{" "}
                    {coachTeam?.name || "N/A"} <br />
                    Created:{" "}
                    {new Date(save.createdAt).toLocaleString()}
                  </p>
                </div>

                <AppButton
                  onClick={() => handleLoad(save.id, save.name)}
                  isLoading={loadingId === save.id}
                >
                  {loadingId === save.id ? "Loading…" : "Resume"}
                </AppButton>
              </AppCard>
            );
          })}
        </div>
      )}

      {/* always-visible back/new buttons */}
      <div className="mt-10 flex gap-4">
        <AppButton
          variant="secondary"
          onClick={() => navigate(titlePageUrl)}
        >
          Back to Menu
        </AppButton>
        <AppButton
          variant="primary"
          onClick={() => navigate(newGameUrl)}
        >
          Start New Game
        </AppButton>
      </div>
    </div>
  );
}
