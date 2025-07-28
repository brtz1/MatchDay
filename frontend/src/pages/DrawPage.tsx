import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";

import { teamUrl, newGameUrl } from "@/utils/paths";

/* ── Types ─────────────────────────────────────────────────────────── */
interface DrawResponse {
  userTeamId: number;
  userTeamName: string;
  saveGameId: number;
  divisionPreview: string[];
}

/* ── Component ─────────────────────────────────────────────────────── */
export default function DrawPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { setCurrentTeamId, setCurrentSaveGameId } = useTeamContext();
  const { setCoachTeamId, setSaveGameId, refreshGameState } = useGameState();

  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(null);
  const [coachName, setCoachName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load country selection from location or localStorage ──
  useEffect(() => {
    const stateCoach = location.state?.coachName;
    const stateCountries = location.state?.selectedCountries;
    const fromStorage = localStorage.getItem("selectedCountries") ?? "[]";
    const parsedCountries =
      stateCountries && Array.isArray(stateCountries) && stateCountries.length
        ? stateCountries
        : (JSON.parse(fromStorage) as string[]);

    if (parsedCountries.length && stateCoach) {
      setCoachName(stateCoach);
      setSelectedCountries(parsedCountries);
    } else {
      navigate(newGameUrl, { replace: true });
    }
  }, [location.state, navigate]);

  // ── Handle team draw and save creation ──
  const handleDraw = async () => {
  if (!coachName.trim()) {
    setError("Please enter your coach name");
    return;
  }
  if (!selectedCountries) return;

  setLoading(true);
  setError(null);

  try {
    const { data } = await axios.post<DrawResponse>("/save-game", {
      name: "New Save",
      coachName,
      countries: selectedCountries,
    });

    const { userTeamId, userTeamName, saveGameId } = data;

    if (!userTeamId || !saveGameId) {
      throw new Error("Invalid draw response from server");
    }

    // ✅ Update all stores
    setCurrentTeamId(userTeamId);
    setCurrentSaveGameId(saveGameId);
    setCoachTeamId(userTeamId);
    setSaveGameId(saveGameId);
    await refreshGameState();

    // ✅ Clear local data and navigate
    localStorage.removeItem("selectedCountries");
    navigate(teamUrl(userTeamId), { replace: true });
  } catch (err: any) {
    console.error("❌ Draw failed:", err);
    setError(err?.response?.data?.error ?? err.message ?? "Draw failed");
  } finally {
    setLoading(false);
  }
};


  if (!selectedCountries) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-800 text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-800 px-4 text-center text-white">
      <h1 className="mb-6 text-5xl font-bold">Draw Your Team</h1>
      {loading ? (
        <AppCard className="w-full max-w-md">
          <p className="mb-3 text-lg">Drawing your team…</p>
          <ProgressBar />
        </AppCard>
      ) : error ? (
        <AppCard className="w-full max-w-md space-y-4">
          <p className="font-semibold text-red-400">{error}</p>
          <AppButton
            variant="secondary"
            className="w-full"
            onClick={() => navigate(newGameUrl)}
          >
            Back
          </AppButton>
        </AppCard>
      ) : (
        <AppCard className="w-full max-w-md space-y-4">
          <input
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            placeholder="Enter your coach name"
            className="w-full rounded-md border border-gray-300 p-3 text-black dark:border-gray-600"
          />
          <AppButton
            variant="primary"
            className="w-full"
            onClick={handleDraw}
          >
            Draw Team
          </AppButton>
        </AppCard>
      )}
    </div>
  );
}
