import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";

import { teamUrl } from "@/utils/paths";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function StandingsPage() {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [grouped, setGrouped] = useState<DivisionStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch standings data
  useEffect(() => {
    axios
      .get<StandingRow[]>('/standings')
      .then(({ data }) => setRows(data))
      .catch(() => setError('Failed to load standings'))
      .finally(() => setLoading(false));
  }, []);

  // Group by division whenever rows update
  useEffect(() => {
    const map: Record<string, StandingRow[]> = {};
    rows.forEach((row) => {
      if (!map[row.division]) map[row.division] = [];
      map[row.division].push(row);
    });
    const divisions = Object.entries(map).map(([division, teams]) => ({ division, teams }));
    setGrouped(divisions);
  }, [rows]);

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
        grouped.map((div) => (
          <AppCard
            key={div.division}
            variant="outline"
            className="overflow-x-auto"
          >
            <h2 className="mb-2 text-xl font-semibold">{div.division}</h2>

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
                    key={team.teamId}
                    className={
                      idx % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                    }
                  >
                    <td className="px-2 py-1 text-left font-medium">
                      <button
                        className="text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200"
                        onClick={() => navigate(teamUrl(team.teamId))}
                      >
                        {team.name}
                      </button>
                    </td>
                    <td className="text-center">{team.points}</td>
                    <td className="text-center">{team.played}</td>
                    <td className="text-center">{team.won}</td>
                    <td className="text-center">{team.draw}</td>
                    <td className="text-center">{team.lost}</td>
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
