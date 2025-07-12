import * as React from "react";
import { useEffect, useMemo, useState } from "react";

/* ── Services ───────────────────────────────────────────────────────────── */
import teamService from "@/services/teamService";

/* ── UI ------------------------------------------------------------------- */
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable, { type Column } from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ── Types ---------------------------------------------------------------- */
interface Team {
  id: number;
  name: string;
  country: string;   // ← keep as required
  budget: number;
}

interface TeamForm {
  name: string;
  country: string;
  budget: number;
}

/* ── Component ------------------------------------------------------------ */
export default function TeamsPage() {
  /* Local state */
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState<TeamForm>({
    name: "",
    country: "",
    budget: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Fetch teams on mount */
  useEffect(() => {
    (async () => {
      try {
        const raw = await teamService.getTeams();               // may have country?: string
        const normalised: Team[] = raw.map((t: any) => ({
          ...t,
          country: t.country ?? "—",                            // ensure string
        }));
        setTeams(normalised);
      } catch {
        setError("Failed to load teams");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Create team */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await teamService.createTeam(form);

      // re-fetch and normalise again
      const raw = await teamService.getTeams();
      setTeams(
        raw.map((t: any) => ({ ...t, country: t.country ?? "—" }))
      );

      setForm({ name: "", country: "", budget: 0 });
      setError(null);
    } catch {
      setError("Failed to create team");
    } finally {
      setSubmitting(false);
    }
  }

  /* Table columns */
  const columns: Column<Team>[] = useMemo(
    () => [
      { header: "Name", accessor: "name", sortable: true },
      { header: "Country", accessor: "country", sortable: true },
      {
        header: "Budget (€)",
        accessor: (row) => row.budget.toLocaleString(),
        cellClass: "text-right",
        sortable: true,
      },
    ],
    []
  );

  /* Render */
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Teams Management
      </h1>

      {/* Existing teams */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Existing Teams</h2>
        {loading ? (
          <ProgressBar />
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <DataTable<Team>
            data={teams}
            columns={columns}
            pageSize={12}
            emptyMessage="No teams yet."
          />
        )}
      </AppCard>

      {/* Add new team */}
      <AppCard>
        <h2 className="mb-4 text-xl font-bold">Add New Team</h2>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2"
        >
          <input
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Team Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />

          <input
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            required
          />

          <input
            type="number"
            min={0}
            className="rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 sm:col-span-2"
            placeholder="Budget (€)"
            value={form.budget}
            onChange={(e) =>
              setForm((f) => ({ ...f, budget: Number(e.target.value) }))
            }
            required
          />

          <AppButton
            type="submit"
            isLoading={submitting}
            className="sm:col-span-2"
          >
            Add Team
          </AppButton>
        </form>
      </AppCard>
    </div>
  );
}
