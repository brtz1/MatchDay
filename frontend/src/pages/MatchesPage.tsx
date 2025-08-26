import * as React from "react";
import { useEffect, useMemo, useState } from "react";

/* ── Services ─────────────────────────────────────────────────────── */
import api from "@/services/axios"; // ← use axios instance directly
import { getTeams } from "@/services/teamService";

/* ── UI components ────────────────────────────────────────────────── */
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ── Routing ───────────────────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";
import { teamUrl, matchUrl } from "@/utils/paths";

/* ── Types ─────────────────────────────────────────────────────────── */
interface Match {
  id: number;
  homeGoals: number | null;
  awayGoals: number | null;
  matchDate?: string;
  homeTeamId: number;
  awayTeamId: number;
  played: boolean;
  homeTeam?: { id: number; name: string };
  awayTeam?: { id: number; name: string };
  matchday?: { number: number };
}

interface Team {
  id: number;
  name: string;
}

interface SimForm {
  homeTeamId: number;
  awayTeamId: number;
}

/* ── Endpoints (keep in sync with backend routes) ──────────────────── */
const MATCHES_ENDPOINT = "/matches";
const SIMULATE_ENDPOINT = (id: number) => `/matches/${id}/simulate`;

/* ── Local helpers ─────────────────────────────────────────────────── */
async function getMatchesHttp(): Promise<Match[]> {
  const { data } = await api.get(MATCHES_ENDPOINT);
  // Accept either raw array or { matches: [...] }
  return Array.isArray(data) ? (data as Match[]) : (data?.matches ?? []);
}

async function simulateMatchHttp(id: number): Promise<void> {
  await api.post(SIMULATE_ENDPOINT(id));
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState<SimForm>({
    homeTeamId: 0,
    awayTeamId: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [m, t] = await Promise.all([getMatchesHttp(), getTeams()]);
        setMatches(m);
        setTeams(t);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const teamName = (id: number) =>
    teams.find((t) => t.id === id)?.name ?? "Unknown";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.homeTeamId === form.awayTeamId) {
      setError("Home and Away teams must differ.");
      return;
    }

    // Find the first unplayed match between these teams
    const target = matches.find(
      (m) =>
        !m.played &&
        m.homeTeamId === form.homeTeamId &&
        m.awayTeamId === form.awayTeamId
    );

    if (!target) {
      setError("No scheduled unplayed match found between these teams.");
      return;
    }

    setSubmitting(true);
    try {
      await simulateMatchHttp(target.id);
      const updated = await getMatchesHttp();
      setMatches(updated);
      setForm({ homeTeamId: 0, awayTeamId: 0 });
      setError(null);
    } catch {
      setError("Simulation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        header: "Home",
        accessor: (m: Match) => (
          <button
            className="text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200"
            onClick={() => navigate(teamUrl(m.homeTeamId))}
          >
            {m.homeTeam?.name ?? teamName(m.homeTeamId)}
          </button>
        ),
      },
      {
        header: "",
        accessor: (m: Match) =>
          m.homeGoals != null && m.awayGoals != null ? (
            <button
              className="text-center font-semibold hover:underline"
              onClick={() => navigate(matchUrl(m.id))}
            >
              {`${m.homeGoals} – ${m.awayGoals}`}
            </button>
          ) : (
            "—"
          ),
        cellClass: "text-center font-semibold",
      },
      {
        header: "Away",
        accessor: (m: Match) => (
          <button
            className="text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200"
            onClick={() => navigate(teamUrl(m.awayTeamId))}
          >
            {m.awayTeam?.name ?? teamName(m.awayTeamId)}
          </button>
        ),
      },
      {
        header: "Date",
        accessor: (m: Match) =>
          m.matchDate ? new Date(m.matchDate).toLocaleDateString() : "TBD",
      },
    ],
    [teams, navigate]
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Match Simulation
      </h1>

      {/* Played Matches */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Played Matches</h2>
        {loading ? (
          <ProgressBar />
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <DataTable<Match>
            data={matches.filter(
              (m) => m.homeGoals !== null && m.awayGoals !== null
            )}
            columns={columns}
            pageSize={10}
            emptyMessage="No matches played yet."
          />
        )}
      </AppCard>

      {/* Simulate Match (Only if already scheduled) */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Simulate Scheduled Match</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Home Team</span>
            <select
              value={form.homeTeamId}
              onChange={(e) =>
                setForm((f) => ({ ...f, homeTeamId: Number(e.target.value) }))
              }
              required
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value={0}>Select…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-semibold">Away Team</span>
            <select
              value={form.awayTeamId}
              onChange={(e) =>
                setForm((f) => ({ ...f, awayTeamId: Number(e.target.value) }))
              }
              required
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value={0}>Select…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <AppButton type="submit" isLoading={submitting} className="sm:col-span-2">
            Simulate Match
          </AppButton>
        </form>
      </AppCard>
    </div>
  );
}
