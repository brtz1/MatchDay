import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";

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
      .then(({ data }) => setSaves(data))
      .catch(() => setError("Could not load saved games."))
      .finally(() => setLoading(false));
  }, []);

  async function handleLoad(saveGameId: number, saveName: string) {
    const confirmed = window.confirm(
      `Load save "${saveName}"?\nUnsaved progress will be lost.`
    );
    if (!confirmed) return;

    setLoadingId(saveGameId);
    setError(null);

    try {
      // 🔥 Tell backend to set this save as active
      await axios.post(`/gamestate/set-save/${saveGameId}`);

      // Load save data
      const { data } = await axios.post<LoadResponse>("/save-game/load", {
        id: saveGameId,
      });

      if (!data.coachTeamId) {
        throw new Error("Missing coach team ID from save");
      }

      setCurrentSaveGameId(saveGameId);
      setCurrentTeamId(data.coachTeamId);

      // ✅ Also refresh GameState
      await refreshGameState();

      navigate(teamUrl(data.coachTeamId));
    } catch (err) {
      console.error(err);
      setError("Failed to load save game.");
      setLoadingId(null);
    }
  }

  function getCoachTeamName(save: SaveGame): string {
    const gameState = saves.find((s) => s.id === save.id);
    const coachTeamId = gameState?.teams.find((t) => t.id === gameState?.teams[0]?.id)?.id;
    const coachTeam = save.teams.find((t) => t.id === coachTeamId);
    return coachTeam?.name || "N/A";
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-green-900 px-4 py-12 text-white">
      <h1 className="text-4xl font-bold">Load Save-Game</h1>

      {loading ? (
        <ProgressBar className="w-64" />
      ) : error ? (
        <p className="font-semibold text-red-400">{error}</p>
      ) : saves.length === 0 ? (
        <p className="text-gray-200">No saves found. Start a new game to begin!</p>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
          {saves.map((save) => {
            const coachTeam = save.teams.find((t) => t.id === save.teams[0]?.id);

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
                    Created: {new Date(save.createdAt).toLocaleString()}
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

      <div className="mt-10 flex gap-4">
        <AppButton variant="secondary" onClick={() => navigate(titlePageUrl)}>
          Back to Menu
        </AppButton>
        <AppButton variant="primary" onClick={() => navigate(newGameUrl)}>
          Start New Game
        </AppButton>
      </div>
    </div>
  );
}
