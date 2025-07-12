import * as React from "react";
import { useEffect, useState } from "react";

import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface StandingsTeam {
  name: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface DivisionStanding {
  division: string; // e.g. "Division 1"
  teams: StandingsTeam[];
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function StandingsPage() {
  const [data, setData] = useState<DivisionStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<DivisionStanding[]>("/standings")
      .then(({ data }) => setData(data))
      .catch(() => setError("Failed to load standings"))
      .finally(() => setLoading(false));
  }, []);

  /* ────────────────────────────────────────────────── Render */
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        League Standings
      </h1>

      {loading ? (
        <ProgressBar className="w-64" />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        data.map((div) => (
          <AppCard
            key={div.division}
            variant="outline"
            className="overflow-x-auto"
          >
            <h2 className="mb-2 text-xl font-semibold">
              {div.division}
            </h2>

            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr className="text-center font-medium">
                  <th className="px-2 text-left">Team</th>
                  <th>Pts</th>
                  <th>Pl</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                </tr>
              </thead>
              <tbody>
                {div.teams.map((team, idx) => (
                  <tr
                    key={team.name}
                    className={
                      idx % 2 === 0
                        ? "bg-white dark:bg-gray-900"
                        : "bg-gray-50 dark:bg-gray-800/50"
                    }
                  >
                    <td className="px-2 py-1 text-left font-medium">
                      {team.name}
                    </td>
                    <td className="text-center">{team.points}</td>
                    <td className="text-center">{team.played}</td>
                    <td className="text-center">{team.wins}</td>
                    <td className="text-center">{team.draws}</td>
                    <td className="text-center">{team.losses}</td>
                    <td className="text-center">{team.goalsFor}</td>
                    <td className="text-center">{team.goalsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AppCard>
        ))
      )}
    </div>
  );
}
