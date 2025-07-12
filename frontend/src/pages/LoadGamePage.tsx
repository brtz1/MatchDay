import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LoadGamePage() {
  const navigate = useNavigate();
  const { setCurrentTeamId, setSaveGameId } = useTeamContext();

  /* ── State */
  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  /* ── Fetch list */
  useEffect(() => {
    axios
      .get<SaveGame[]>("/save-game", { params: { includeTeams: true } })
      .then(({ data }) => setSaves(data))
      .catch(() => setError("Could not load save-games"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Load chosen save */
  async function handleLoad(id: number, name: string) {
    if (
      !window.confirm(
        `Load save “${name}”? Unsaved progress will be lost.`
      )
    )
      return;

    setLoadingId(id);
    try {
      const { data } = await axios.post<LoadResponse>(
        "/save-game/load",
        { id }
      );

      if (!data.coachTeamId) throw new Error("Missing coach team id");

      setSaveGameId(id);
      setCurrentTeamId(data.coachTeamId);
      navigate(`/team/${data.coachTeamId}`);
    } catch (err) {
      setError("Failed to load selected save-game");
      setLoadingId(null);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-green-900 px-4 py-12 text-white">
      <h1 className="text-4xl font-bold">Load Save-Game</h1>

      {loading ? (
        <ProgressBar className="w-64" />
      ) : error ? (
        <p className="font-semibold text-red-400">{error}</p>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
          {saves.map((save) => {
            const coachTeam =
              save.teams?.find((t) => t.division === "D4") ??
              save.teams?.[0];

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

      {/* Footer actions */}
      <div className="mt-10 flex gap-4">
        <AppButton
          variant="secondary"
          onClick={() => navigate("/")}
        >
          Back to Menu
        </AppButton>
        <AppButton
          variant="primary"
          onClick={() => navigate("/country-selection")}
        >
          Start New Game
        </AppButton>
      </div>
    </div>
  );
}
