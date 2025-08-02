import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";

interface MatchResult {
  id: number;
  division: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

export default function FullTimeResultsPage() {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<MatchResult[]>("/results/latest");
        setResults(data);
      } catch (e) {
        console.error("Failed to fetch match results", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleProceed = async () => {
    try {
      const { data } = await api.post("/matchday/advance-after-results");
      const coachTeamId = data.coachTeamId;
      navigate("/standings", { state: { coachTeamId } });
    } catch (error) {
      console.error("❌ Failed to advance after results:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-900 text-white">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-green-900 p-4 text-white">
      <h1 className="text-2xl font-bold">Full-Time Results</h1>

      <AppCard variant="outline" className="bg-white/10 p-4">
        {results.map((match) => (
          <div key={match.id} className="mb-2 border-b border-white/20 pb-1">
            <div className="text-sm text-white/90">
              {match.division} – {match.homeTeam} {match.homeGoals} x {match.awayGoals} {match.awayTeam}
            </div>
          </div>
        ))}
      </AppCard>

      <div className="mt-4 self-end">
        <AppButton onClick={handleProceed}>Proceed</AppButton>
      </div>
    </div>
  );
}
