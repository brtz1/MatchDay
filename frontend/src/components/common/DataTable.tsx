import * as React from "react";
import {
  useState,
  useMemo,
  Fragment,
  type ReactNode,
  type MouseEvent,
} from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";

/**
 * ---------------------------------------------------------------------------
 *  Types
 * ---------------------------------------------------------------------------
 */

export interface Column<T> {
  /** Column header text / JSX. */
  header: ReactNode;
  /**
   * Accessor for cell content.
   *  – keyof T   reads `(row as any)[accessor]`
   *  – fn(row)  custom render
   */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Enable sortable behaviour. */
  sortable?: boolean;
  /** Optional custom class for <td>. */
  cellClass?: string;
  /** Optional custom class for <th>. */
  headerClass?: string;
}

export interface DataTableProps<T> {
  /** Array of data rows. */
  data: T[];
  /** Column definitions. */
  columns: Column<T>[];
  /** Unique key generator (defaults to index). */
  rowKey?: (row: T, index: number) => string | number;
  /** Optional row click handler. */
  onRowClick?: (row: T) => void;
  /** Rows per page (pagination). Defaults to 10. */
  pageSize?: number;
  /** Show spinner when true. */
  isLoading?: boolean;
  /** Message to display when `data.length === 0`. */
  emptyMessage?: string;
  /** Tailwind classes for the wrapper div. */
  className?: string;
}

/**
 * ---------------------------------------------------------------------------
 *  Component
 * ---------------------------------------------------------------------------
 */

export function DataTable<T>({
  data,
  columns,
  rowKey = (_, i) => i,
  onRowClick,
  pageSize = 10,
  isLoading = false,
  emptyMessage = "No data",
  className,
}: DataTableProps<T>) {
  // ────────────────────────────────────────────────────────────────── Sorting
  const [sortKey, setSortKey] = useState<keyof T | string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    setSortKey((prev) =>
      prev === col.accessor ? (col.accessor as any) : (col.accessor as any)
    );
    setSortAsc((prev) => (col.accessor === sortKey ? !prev : true));
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const accessor =
      typeof sortKey === "function"
        ? sortKey
        : (row: T) => (row as any)[sortKey];
    return [...data].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return (av > bv ? 1 : -1) * (sortAsc ? 1 : -1);
    });
  }, [data, sortKey, sortAsc]);

  // ─────────────────────────────────────────────────────────────── Pagination
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function go(delta: number) {
    setPage((p) => Math.max(0, Math.min(totalPages - 1, p + delta)));
  }

  // Reset page when data changes
  React.useEffect(() => {
    setPage(0);
  }, [sorted.length]);

  // ─────────────────────────────────────────────────────────────────── Render
  return (
    <div className={clsx("w-full", className)}>
      <div className="overflow-x-auto rounded-2xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={clsx(
                    "px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 select-none",
                    col.headerClass,
                    col.sortable && "cursor-pointer"
                  )}
                  onClick={() => toggleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <ChevronsUpDown
                        className={clsx(
                          "h-4 w-4 transition-transform",
                          sortKey === col.accessor
                            ? sortAsc
                              ? "-rotate-180"
                              : ""
                            : "opacity-20"
                        )}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <Fragment key={rowKey(row, i)}>
                  <tr
                    className={clsx(
                      "hover:bg-gray-50 dark:hover:bg-gray-800",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col, ci) => (
                      <td
                        key={ci}
                        className={clsx(
                          "whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100",
                          col.cellClass
                        )}
                      >
                        {typeof col.accessor === "function"
                          ? col.accessor(row)
                          : (row as any)[col.accessor]}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => go(-1)}
            className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => go(1)}
            className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
