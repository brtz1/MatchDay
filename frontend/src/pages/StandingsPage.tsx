import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import TopNavBar from "@/components/common/TopNavBar";
import { useGameState } from "@/store/GameStateStore";
import { teamUrl } from "@/utils/paths";

interface StandingRow {
  teamId: number;
  name: string;
  division: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface DivisionStanding {
  division: string;
  teams: StandingRow[];
}

export default function StandingsPage() {
  const [grouped, setGrouped] = useState<DivisionStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { saveGameId, coachTeamId } = useGameState();

  useEffect(() => {
    if (!saveGameId) return;
    setLoading(true);
    axios
      .get<DivisionStanding[]>(`/standings?saveGameId=${saveGameId}`)
      .then(({ data }) => setGrouped(data))
      .catch(() => {
        setError("Failed to load standings");
        setGrouped([]);
      })
      .finally(() => setLoading(false));
  }, [saveGameId]);

  // Auto-navigate to team after 30s ONLY if coming from FullTimeResults
  useEffect(() => {
    if (location.state?.fromResults && coachTeamId) {
      const timeout = setTimeout(() => {
        navigate(`/team/${coachTeamId}`);
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [location.state, coachTeamId, navigate]);

  const gridDivisions = [
    grouped.find((d) => d.division === "D1"),
    grouped.find((d) => d.division === "D3"),
    grouped.find((d) => d.division === "D2"),
    grouped.find((d) => d.division === "D4"),
  ];

  return (
    <div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <TopNavBar coachTeamId={coachTeamId ?? -1} />
      <h1 className="mb-4 text-3xl font-extrabold text-blue-700 dark:text-blue-300 tracking-tight drop-shadow-sm text-center">
        League Standings
      </h1>

      {loading ? (
        <ProgressBar className="w-64 mx-auto" />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : grouped.length === 0 ? (
        <p className="text-gray-500">No standings available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {gridDivisions.map((div, idx) =>
            div ? (
              <DivisionCard key={div.division} div={div} navigate={navigate} />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function DivisionCard({
  div,
  navigate,
}: {
  div: DivisionStanding;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <AppCard
      variant="default"
      className="mb-0 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-200/80 shadow-lg dark:border-blue-900 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-800/80"
    >
      <div className="mb-4 flex items-center rounded-lg bg-blue-100 px-4 py-2 shadow-inner dark:bg-blue-900/60">
        <h2 className="text-2xl font-bold tracking-wide text-blue-700 dark:text-yellow-300 uppercase">
          {divisionNamePretty(div.division)}
        </h2>
      </div>
      <div className="rounded-xl bg-white/90 p-0 shadow-inner dark:bg-gray-950/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/70">
            <tr className="text-center font-semibold text-blue-700 dark:text-blue-200">
              <th className="px-3 py-2 text-left">Team</th>
              <th>Pts</th>
              <th>Pl</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
            </tr>
          </thead>
          <tbody>
            {div.teams.map((team, idx) => (
              <tr
                key={team.teamId}
                className={`transition-colors duration-100 ${idx % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-blue-100/60 dark:bg-blue-950/30'} hover:bg-yellow-100 dark:hover:bg-yellow-900/30`}
              >
                <td className="px-3 py-2 text-left font-medium">
                  <button
                    className="transition-colors text-blue-600 underline hover:text-yellow-700 dark:text-yellow-300 dark:hover:text-yellow-100"
                    onClick={() => navigate(teamUrl(team.teamId))}
                  >
                    {team.name}
                  </button>
                </td>
                <td className="text-center font-bold">{team.points}</td>
                <td className="text-center">{team.played}</td>
                <td className="text-center">{team.won}</td>
                <td className="text-center">{team.draw}</td>
                <td className="text-center">{team.lost}</td>
                <td className="text-center">{team.goalsFor}</td>
                <td className="text-center">{team.goalsAgainst}</td>
                <td className="text-center">{team.goalDifference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppCard>
  );
}

function divisionNamePretty(division: string) {
  switch (division) {
    case "D1": return "Division 1";
    case "D2": return "Division 2";
    case "D3": return "Division 3";
    case "D4": return "Division 4";
    default: return division;
  }
}
