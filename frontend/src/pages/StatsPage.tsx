import * as React from "react";
import { useEffect, useState } from "react";

import playersService from "@/services/playersService";
import matchService from "@/services/matchService";
import statsService from "@/services/statsService";

import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable, { type Column } from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";

interface PlayerLite {
  id: number;
  name: string;
}

interface MatchLite {
  id: number;
}

interface PlayerStat {
  id: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  matchId: number;
}

interface StatForm {
  matchId: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  injuries: number;
}

export default function StatsPage() {
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [matches, setMatches] = useState<MatchLite[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);

  const [form, setForm] = useState<StatForm>({
    matchId: 0,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    injuries: 0,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [p, m] = await Promise.all([
          playersService.getPlayers(),
          matchService.getMatches(),
        ]);
        setPlayers(p);
        setMatches(m);
      } catch {
        setError("Failed to load players or matches");
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function handleSelectPlayer(id: number) {
    setSelectedPlayer(id);
    setLoading(true);
    try {
      const s = await statsService.getPlayerStats(id);
      setStats(s);
    } catch {
      setError("Failed to fetch player stats");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayer) return;
    setSubmitting(true);
    try {
      await statsService.recordPlayerStats({
        playerId: selectedPlayer,
        ...form,
      });
      handleSelectPlayer(selectedPlayer);
      setForm({ matchId: 0, goals: 0, assists: 0, yellow: 0, red: 0, injuries: 0 });
    } catch {
      setError("Failed to record stats");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<PlayerStat>[] = React.useMemo(
    () => [
      { header: "Match", accessor: (r) => `#${r.matchId}` },
      { header: "Goals", accessor: "goals", cellClass: "text-right" },
      { header: "Assists", accessor: "assists", cellClass: "text-right" },
      { header: "Yellow", accessor: "yellow", cellClass: "text-right" },
      { header: "Red", accessor: "red", cellClass: "text-right" },
    ],
    []
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Player Statistics
      </h1>

      <AppCard>
        <label className="mb-2 block font-semibold">Select Player</label>
        <select
          className="w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          value={selectedPlayer ?? ""}
          onChange={(e) => handleSelectPlayer(Number(e.target.value))}
        >
          <option value="">— choose —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </AppCard>

      {selectedPlayer && (
        <AppCard>
          <h2 className="mb-4 text-xl font-bold">Match Stats</h2>
          {loading ? (
            <ProgressBar />
          ) : (
            <DataTable<PlayerStat>
              data={stats}
              columns={columns}
              emptyMessage="No stats recorded."
              pageSize={10}
            />
          )}
        </AppCard>
      )}

      {selectedPlayer && (
        <AppCard>
          <h2 className="mb-4 text-xl font-bold">Record New Stats</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <select
              value={form.matchId}
              onChange={(e) => setForm({ ...form, matchId: Number(e.target.value) })}
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 sm:col-span-2"
              required
            >
              <option value={0}>Select match</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>#{m.id}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Goals"
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: Number(e.target.value) })}
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />
            <input
              type="number"
              placeholder="Assists"
              value={form.assists}
              onChange={(e) => setForm({ ...form, assists: Number(e.target.value) })}
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />
            <input
              type="number"
              placeholder="Yellow Cards"
              value={form.yellow}
              onChange={(e) => setForm({ ...form, yellow: Number(e.target.value) })}
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />
            <input
              type="number"
              placeholder="Red Cards"
              value={form.red}
              onChange={(e) => setForm({ ...form, red: Number(e.target.value) })}
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />
            <input
              type="number"
              placeholder="Injuries"
              value={form.injuries}
              onChange={(e) => setForm({ ...form, injuries: Number(e.target.value) })}
              className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />

            <AppButton type="submit" isLoading={submitting} className="sm:col-span-2">
              Record Stats
            </AppButton>
          </form>
        </AppCard>
      )}

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
