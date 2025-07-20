import * as React from "react";
import { useEffect, useMemo, useState } from "react";

/* ── Services ───────────────────────────────────────────────────────────── */
import { getTeams } from "@/services/teamService";

/* ── UI ------------------------------------------------------------------- */
import { AppCard } from "@/components/common/AppCard";
import DataTable, { type Column } from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ── Types ---------------------------------------------------------------- */
interface Team {
  id: number;
  name: string;
  country: string;
  budget: number;
}

/* ── Component ------------------------------------------------------------ */
export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Fetch teams on mount */
  useEffect(() => {
    (async () => {
      try {
        const raw = await getTeams();
        const normalised: Team[] = raw.map((t: any) => ({
          ...t,
          country: t.country ?? "—",
        }));
        setTeams(normalised);
      } catch {
        setError("Failed to load teams");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    </div>
  );
}
