// frontend/src/pages/PostMatchSummary.tsx
import * as React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
interface MatchEvent {
  minute: number;
  type: string;
  desc: string;
}

interface MatchSummary {
  matchId: number;
  home: string;
  away: string;
  score: string; // e.g. "2 – 1"
  events: MatchEvent[];
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function PostMatchSummary() {
  // now reading matchdayId from the URL
  const { matchdayId } = useParams<{ matchdayId: string }>();
  const id = Number(matchdayId);

  const [data, setData] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isNaN(id)) {
      setError("Invalid matchday");
      setLoading(false);
      return;
    }
    setLoading(true);
    axios
      .get<MatchSummary[]>(`/match-summary/${id}`)
      .then(({ data }) => setData(data))
      .catch(() => setError("Failed to load post-match summary."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ProgressBar className="w-64" />;
  if (error)   return <p className="text-red-500">{error}</p>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
        Post-Match Summary — Matchday {id}
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
                  {e.minute}&prime; — <strong>{e.type}</strong>: {e.desc}
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      ))}
    </div>
  );
}
