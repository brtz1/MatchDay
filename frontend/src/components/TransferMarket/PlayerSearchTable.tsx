import * as React from "react";
import { useMemo } from "react";
import clsx from "clsx";
import DataTable, {
  type Column,
} from "@/components/common/DataTable";
import { getFlagUrl } from "@/utils/getFlagUrl";

/**
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

export interface PlayerRow {
  id: string | number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
  price: number;
  nationality: string; // ISO-2 code
  teamName: string;
  teamId: string | number;
}

export interface PlayerSearchTableProps {
  players: PlayerRow[];
  /** Show spinner. */
  isLoading?: boolean;
  /** Fires when user clicks a row. */
  onSelect?: (player: PlayerRow) => void;
  className?: string;
  /** Rows per page, default 15. */
  pageSize?: number;
}

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */

export default function PlayerSearchTable({
  players,
  isLoading = false,
  onSelect,
  className,
  pageSize = 15,
}: PlayerSearchTableProps) {
  /* ─────────────────────────────────────────── Columns */
  const columns: Column<PlayerRow>[] = useMemo(
    () => [
      {
        header: "Name",
        accessor: (row) => (
          <span className="truncate">{row.name}</span>
        ),
        sortable: true,
        headerClass: "w-40",
      },
      {
        header: "Pos",
        accessor: "position",
        sortable: true,
        cellClass: "text-center",
        headerClass: "w-10",
      },
      {
        header: "Rat",
        accessor: "rating",
        sortable: true,
        cellClass: "text-right",
        headerClass: "w-12",
      },
      {
        header: "Price",
        accessor: (row) =>
          `€${row.price.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`,
        sortable: true,
        cellClass: "text-right",
        headerClass: "w-24",
      },
      {
        header: "Nat",
        accessor: (row) =>
          row.nationality ? (
            <img
              src={getFlagUrl(row.nationality)}
              alt={row.nationality}
              className="mx-auto h-4 w-5"
            />
          ) : (
            ""
          ),
        headerClass: "w-12 text-center",
      },
      {
        header: "Team",
        accessor: (row) => (
          <span className="truncate">{row.teamName}</span>
        ),
        sortable: true,
        headerClass: "w-40",
      },
    ],
    []
  );

  /* ─────────────────────────────────────────── Render */
  return (
    <div className={clsx("w-full", className)}>
      <DataTable<PlayerRow>
        data={players}
        columns={columns}
        onRowClick={onSelect}
        isLoading={isLoading}
        pageSize={pageSize}
        emptyMessage="No players match the filters."
        rowKey={(row) => row.id}
      />
    </div>
  );
}
