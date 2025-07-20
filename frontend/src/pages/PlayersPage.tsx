import * as React from "react";
import { useEffect, useState } from "react";

import playersService from "@/services/playersService";
import { getTeams } from "@/services/teamService";

import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable, { type Column } from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ── Routing ───────────────────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";
import { teamUrl } from "@/utils/paths"; // ✅ centralized team route

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Player {
  id: number;
  name: string;
  age: number;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
  value: number;
  salary: number;
  team?: { id: number; name: string };
}

interface Team {
  id: number;
  name: string;
}

interface PlayerForm extends Omit<Player, "id" | "team"> {
  teamId?: number;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState<PlayerForm>({
    name: "",
    age: 18,
    position: "MF",
    rating: 50,
    value: 0,
    salary: 0,
    teamId: undefined,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function bootstrap() {
      try {
        const [p, t] = await Promise.all([
          playersService.getPlayers(),
          getTeams(),
        ]);
        setPlayers(p);
        setTeams(t);
      } catch {
        setError("Failed to load players or teams");
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await playersService.createPlayer(form);
      setPlayers(await playersService.getPlayers());
      setForm({
        name: "",
        age: 18,
        position: "MF",
        rating: 50,
        value: 0,
        salary: 0,
        teamId: undefined,
      });
    } catch {
      setError("Failed to create player");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Player>[] = React.useMemo(
    () => [
      { header: "Name", accessor: "name", sortable: true },
      { header: "Age", accessor: "age", sortable: true, cellClass: "text-right" },
      { header: "Pos", accessor: "position", sortable: true, cellClass: "text-center" },
      { header: "Rating", accessor: "rating", sortable: true, cellClass: "text-right" },
      {
        header: "Value",
        accessor: (row) => `€${row.value.toLocaleString()}`,
        sortable: true,
        cellClass: "text-right",
      },
      {
        header: "Salary",
        accessor: (row) => `€${row.salary.toLocaleString()}`,
        sortable: true,
        cellClass: "text-right",
      },
      {
        header: "Team",
        accessor: (row) =>
          row.team ? (
            <button
              className="text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200"
              onClick={() => navigate(teamUrl(row.team!.id))}
            >
              {row.team.name}
            </button>
          ) : (
            "Free Agent"
          ),
        sortable: true,
      },
    ],
    [navigate]
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Players Management
      </h1>

      {/* Existing players ------------------------------------------------ */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Existing Players</h2>
        {loading ? (
          <ProgressBar />
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <DataTable<Player>
            data={players}
            columns={columns}
            pageSize={15}
            emptyMessage="No players available."
          />
        )}
      </AppCard>

      {/* Add player form ------------------------------------------------- */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Add New Player</h2>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <input
            type="number"
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Age"
            value={form.age}
            min={15}
            max={45}
            onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
            required
          />

          <select
            value={form.position}
            onChange={(e) =>
              setForm({ ...form, position: e.target.value as Player["position"] })
            }
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="GK">GK</option>
            <option value="DF">DF</option>
            <option value="MF">MF</option>
            <option value="AT">AT</option>
          </select>

          <input
            type="number"
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Rating"
            value={form.rating}
            min={1}
            max={99}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            required
          />

          <input
            type="number"
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Value (€)"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            required
          />

          <input
            type="number"
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Salary (€)"
            value={form.salary}
            onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
            required
          />

          <select
            value={form.teamId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                teamId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 lg:col-span-3"
          >
            <option value="">Free Agent</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <AppButton
            type="submit"
            isLoading={submitting}
            className="lg:col-span-3"
          >
            Add Player
          </AppButton>
        </form>
      </AppCard>
    </div>
  );
}
