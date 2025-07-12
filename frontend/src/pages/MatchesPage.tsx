import * as React from "react";
import { useEffect, useMemo, useState } from "react";

/* ── Services ─────────────────────────────────────────────────────── */
import matchService from "@/services/matchService";
import teamService from "@/services/teamService";
import refereeService from "@/services/refereeService";

/* ── UI components ────────────────────────────────────────────────── */
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ── Types (matchDate & scores may be missing) ────────────────────── */
interface Match {
  id: number;
  homeScore?: number;
  awayScore?: number;
  matchDate?: string;
  season?: number;
  homeTeamId: number;
  awayTeamId: number;
}
interface Team    { id: number; name: string }
interface Referee { id: number; name: string }
interface MatchForm { homeTeamId: number; awayTeamId: number; refereeId: number }

/* ── Component ────────────────────────────────────────────────────── */
export default function MatchesPage() {
  /* state */
  const [matches,  setMatches]  = useState<Match[]>([]);
  const [teams,    setTeams]    = useState<Team[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [form, setForm] = useState<MatchForm>({ homeTeamId: 0, awayTeamId: 0, refereeId: 0 });
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  /* bootstrap */
  useEffect(() => {
    (async () => {
      try {
        const [m, t, r] = await Promise.all([
          matchService.getMatches(),
          teamService.getTeams(),
          refereeService.getReferees(),
        ]);
        setMatches(m);
        setTeams(t);
        setReferees(r);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* helpers */
  const teamName = (id: number) => teams.find((t) => t.id === id)?.name ?? "Unknown";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.homeTeamId === form.awayTeamId) {
      setError("Home and Away teams must differ.");
      return;
    }
    setSubmitting(true);
    try {
      await matchService.simulateMatch(form);
      const updated = await matchService.getMatches();
      setMatches(updated);
      setForm({ homeTeamId: 0, awayTeamId: 0, refereeId: 0 });
      setError(null);
    } catch {
      setError("Simulation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  /* data-table columns (guard against undefined fields) */
  const columns = useMemo(
    () => [
      { header: "Home", accessor: (m: Match) => teamName(m.homeTeamId) },
      {
        header: "",
        accessor: (m: Match) =>
          m.homeScore != null && m.awayScore != null
            ? `${m.homeScore} – ${m.awayScore}`
            : "—",
        cellClass: "text-center font-semibold",
      },
      { header: "Away", accessor: (m: Match) => teamName(m.awayTeamId) },
      {
        header: "Date",
        accessor: (m: Match) =>
          m.matchDate ? new Date(m.matchDate).toLocaleDateString() : "TBD",
      },
    ],
    [teams]
  );

  /* render */
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Match Simulation
      </h1>

      {/* played matches */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Played Matches</h2>
        {loading ? (
          <ProgressBar />
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <DataTable<Match>
            data={matches}
            columns={columns}
            pageSize={10}
            emptyMessage="No matches played yet."
          />
        )}
      </AppCard>

      {/* simulate new match */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Simulate New Match</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {/* home team */}
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Home Team</span>
            <select
              value={form.homeTeamId}
              onChange={(e) => setForm((f) => ({ ...f, homeTeamId: Number(e.target.value) }))}
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

          {/* away team */}
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Away Team</span>
            <select
              value={form.awayTeamId}
              onChange={(e) => setForm((f) => ({ ...f, awayTeamId: Number(e.target.value) }))}
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

          {/* referee */}
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-semibold">Referee</span>
            <select
              value={form.refereeId}
              onChange={(e) => setForm((f) => ({ ...f, refereeId: Number(e.target.value) }))}
              required
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value={0}>Select…</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
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
