// src/pages/FixturesPage.tsx
import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { useTeamContext } from "@/store/TeamContext";
import { teamUrl } from "@/utils/paths";

/* ── Types ───────────────────────────── */
interface Match {
  id: number;
  matchday: number;
  matchdayType: "LEAGUE" | "CUP";
  divisionTier: number | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  homeGoals: number | null;
  awayGoals: number | null;
  isPlayed: boolean;
}

interface GroupedMatchday {
  matchday: number;
  matchdayType: "LEAGUE" | "CUP";
  matches: Match[];
}

/* ── Component ───────────────────────── */
export default function FixturesPage() {
  const navigate = useNavigate();
  const { currentTeamId } = useTeamContext();

  const [fixtures, setFixtures] = useState<GroupedMatchday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFixtures() {
      setLoading(true);
      try {
        const { data } = await axios.get<Match[]>("/matches/all");
        const grouped = groupFixturesByMatchday(data);
        setFixtures(grouped);
      } catch {
        setError("Failed to load fixtures.");
      } finally {
        setLoading(false);
      }
    }

    fetchFixtures();
  }, []);

  function groupFixturesByMatchday(matches: Match[]): GroupedMatchday[] {
    const map = new Map<string, GroupedMatchday>();

    for (const match of matches) {
      const key = `${match.matchdayType}-${match.matchday}`;
      if (!map.has(key)) {
        map.set(key, {
          matchday: match.matchday,
          matchdayType: match.matchdayType,
          matches: [],
        });
      }
      map.get(key)!.matches.push(match);
    }

    return Array.from(map.values()).sort((a, b) => a.matchday - b.matchday);
  }

  function formatScore(match: Match) {
    return match.isPlayed
      ? `${match.homeGoals} - ${match.awayGoals}`
      : "vs";
  }

  function formatMatchdayLabel(group: GroupedMatchday) {
    if (group.matchdayType === "LEAGUE") {
      return `League Matchday ${group.matchday}`;
    }
    const labels = [
      "Round of 128", "Round of 64", "Round of 32", "Round of 16",
      "Quarterfinal", "Semifinal", "Final"
    ];
    return labels[group.matchday - 1] || `Cup Matchday ${group.matchday}`;
  }

  function handleTeamClick(teamId: number) {
    navigate(teamUrl(teamId));
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Fixtures
      </h1>

      {loading ? (
        <ProgressBar />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : fixtures.length === 0 ? (
        <p className="text-gray-500">No fixtures available.</p>
      ) : (
        fixtures.map((group) => (
          <AppCard key={`${group.matchdayType}-${group.matchday}`}>
            <h2 className="text-xl font-bold mb-2">
              {formatMatchdayLabel(group)}
            </h2>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {group.matches.map((match) => (
                <li
                  key={match.id}
                  className="flex items-center justify-between py-2"
                >
                  <span
                    className="cursor-pointer hover:underline text-blue-600 dark:text-blue-300"
                    onClick={() => handleTeamClick(match.homeTeam.id)}
                  >
                    {match.homeTeam.name}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 font-semibold">
                    {formatScore(match)}
                  </span>
                  <span
                    className="cursor-pointer hover:underline text-blue-600 dark:text-blue-300"
                    onClick={() => handleTeamClick(match.awayTeam.id)}
                  >
                    {match.awayTeam.name}
                  </span>
                </li>
              ))}
            </ul>
          </AppCard>
        ))
      )}

      <div className="pt-4">
        <AppButton variant="secondary" onClick={() => navigate(teamUrl(currentTeamId ?? 1))}>
          Back to My Team
        </AppButton>
      </div>
    </div>
  );
}
