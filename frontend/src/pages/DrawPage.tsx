import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";

import { teamUrl, newGameUrl } from "@/utils/paths"; // ✅ Use centralized paths

interface DrawResponse {
  userTeamId: number;
  userTeamName: string;
  saveGameId: number;
  divisionPreview: string[];
}

export default function DrawPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { setCurrentTeamId, setSaveGameId } = useTeamContext();

  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(null);
  const [coachName, setCoachName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [userTeamId, setUserTeamId] = useState<number | null>(null);
  const [divisionPreview, setDivisionPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load countries from state or localStorage
  useEffect(() => {
    const fromState = location.state?.selectedCountries;
    const fromStorage = localStorage.getItem("selectedCountries") ?? "[]";

    const parsed =
      fromState && Array.isArray(fromState) && fromState.length
        ? fromState
        : (JSON.parse(fromStorage) as string[]);

    if (parsed.length) {
      setSelectedCountries(parsed);
    } else {
      navigate(newGameUrl, { replace: true }); // ✅ Use constant
    }
  }, [location.state, navigate]);

  // Redirect to team roster after draw
  useEffect(() => {
    if (userTeamId) {
      setCurrentTeamId(userTeamId);
      navigate(teamUrl(userTeamId), { replace: true }); // ✅ Use helper
    }
  }, [userTeamId, setCurrentTeamId, navigate]);

  async function handleDraw() {
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

      const { userTeamId, userTeamName, saveGameId, divisionPreview } = data;

      if (!userTeamId || !saveGameId) {
        throw new Error("Invalid draw response from server");
      }

      setSaveGameId(saveGameId);
      setTeamName(userTeamName);
      setUserTeamId(userTeamId);
      setDivisionPreview(divisionPreview);
      localStorage.removeItem("selectedCountries");
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err.message ?? "Draw failed");
      setLoading(false);
    }
  }

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
            onClick={() => navigate(newGameUrl)} // ✅ Use constant
          >
            Back
          </AppButton>
        </AppCard>
      ) : teamName ? (
        <AppCard className="w-full max-w-xl space-y-6 bg-white/10">
          <div>
            <p className="mb-2 text-xl">You will coach</p>
            <p className="text-4xl font-bold text-yellow-400">{teamName}</p>
          </div>

          <div className="rounded-lg bg-white/10 p-4 text-left">
            <h2 className="mb-2 text-lg font-semibold">Division Preview</h2>
            <ul className="space-y-1 text-sm text-gray-200">
              {divisionPreview.map((d, i) => (
                <li key={i} className="border-b border-gray-700 py-1 last:border-b-0">
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <AppButton
            variant="primary"
            className="w-full"
            onClick={() => userTeamId && navigate(teamUrl(userTeamId), { replace: true })} // ✅ Use helper
          >
            Let&apos;s Go!
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
          <AppButton variant="primary" className="w-full" onClick={handleDraw}>
            Draw Team
          </AppButton>
        </AppCard>
      )}
    </div>
  );
}
