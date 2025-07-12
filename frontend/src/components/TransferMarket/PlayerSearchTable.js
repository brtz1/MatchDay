import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
import clsx from "clsx";
import DataTable from "@/components/common/DataTable";
import { getFlagUrl } from "@/utils/getFlagUrl";
/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export default function PlayerSearchTable({ players, isLoading = false, onSelect, className, pageSize = 15, }) {
    /* ─────────────────────────────────────────── Columns */
    const columns = useMemo(() => [
        {
            header: "Name",
            accessor: (row) => (_jsx("span", { className: "truncate", children: row.name })),
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
            accessor: (row) => `€${row.price.toLocaleString(undefined, {
                maximumFractionDigits: 0,
            })}`,
            sortable: true,
            cellClass: "text-right",
            headerClass: "w-24",
        },
        {
            header: "Nat",
            accessor: (row) => row.nationality ? (_jsx("img", { src: getFlagUrl(row.nationality), alt: row.nationality, className: "mx-auto h-4 w-5" })) : (""),
            headerClass: "w-12 text-center",
        },
        {
            header: "Team",
            accessor: (row) => (_jsx("span", { className: "truncate", children: row.teamName })),
            sortable: true,
            headerClass: "w-40",
        },
    ], []);
    /* ─────────────────────────────────────────── Render */
    return (_jsx("div", { className: clsx("w-full", className), children: _jsx(DataTable, { data: players, columns: columns, onRowClick: onSelect, isLoading: isLoading, pageSize: pageSize, emptyMessage: "No players match the filters.", rowKey: (row) => row.id }) }));
}
//# sourceMappingURL=PlayerSearchTable.js.map