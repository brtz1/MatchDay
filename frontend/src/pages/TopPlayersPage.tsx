import * as React from "react";
import { useEffect, useState } from "react";

import axios from "@/services/axios";
import DataTable, { type Column } from "@/components/common/DataTable";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface PlayerStats {
  id: number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  nationality: string;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function TopPlayersPage() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch ------------------------------------------------------------ */
  useEffect(() => {
    axios
      .get<PlayerStats[]>("/stats/top") // endpoint returns league-wide leaders
      .then(({ data }) => setPlayers(data))
      .catch(() => setError("Failed to fetch player stats"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Columns ---------------------------------------------------------- */
  const columns: Column<PlayerStats>[] = React.useMemo(
    () => [
      { header: "Name", accessor: "name", sortable: true },
      {
        header: "Pos",
        accessor: "position",
        cellClass: "text-center",
        sortable: true,
      },
      {
        header: "Nat",
        accessor: (row) =>
          row.nationality ? (
            <img
              src={getFlagUrl(row.nationality)}
              alt={row.nationality}
              className="mx-auto h-4 w-6"
            />
          ) : (
            ""
          ),
        headerClass: "text-center w-12",
      },
      {
        header: "G",
        accessor: "goals",
        cellClass: "text-right",
        sortable: true,
      },
      {
        header: "A",
        accessor: "assists",
        cellClass: "text-right",
        sortable: true,
      },
      {
        header: "Y",
        accessor: "yellow",
        cellClass: "text-right",
        sortable: true,
      },
      {
        header: "R",
        accessor: "red",
        cellClass: "text-right",
        sortable: true,
      },
    ],
    []
  );

  /* ── Render ----------------------------------------------------------- */
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Player Statistics Leaders
      </h1>

      <AppCard>
        {loading ? (
          <ProgressBar />
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <DataTable<PlayerStats>
            data={players}
            columns={columns}
            pageSize={20}
            emptyMessage="No stats found."
          />
        )}
      </AppCard>
    </div>
  );
}
