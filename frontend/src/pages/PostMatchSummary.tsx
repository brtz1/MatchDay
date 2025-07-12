import * as React from "react";
import { useEffect, useState } from "react";

import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface MatchEvent {
  minute: number;
  type: string;
  desc: string;
}

export interface MatchSummary {
  matchId: number;
  home: string;
  away: string;
  score: string; // e.g. "2 – 1"
  events: MatchEvent[];
}

export interface PostMatchSummaryProps {
  matchdayId: number;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function PostMatchSummary({
  matchdayId,
}: PostMatchSummaryProps) {
  const [data, setData] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get<MatchSummary[]>(`/match-summary/${matchdayId}`)
      .then(({ data }) => setData(data))
      .catch(() =>
        setError("Failed to load post-match summary.")
      )
      .finally(() => setLoading(false));
  }, [matchdayId]);

  if (loading) {
    return (
      <div className="p-4">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
        Post-Match Summary
      </h1>

      {data.map((m) => (
        <AppCard key={m.matchId} variant="outline">
          <h2 className="mb-2 text-md font-semibold">
            {m.home} {m.score} {m.away}
          </h2>

          {m.events.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No notable events.
            </p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm text-gray-700 dark:text-gray-200">
              {m.events.map((e, idx) => (
                <li key={idx}>
                  {e.minute}&prime; — <span className="font-medium">{e.type}</span>: {e.desc}
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      ))}
    </div>
  );
}
