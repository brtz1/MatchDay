import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/common/DataTable.tsx
import * as React from "react";
import { useState, useMemo, Fragment, } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
/* ───────────────────────────────────────────────────────────────────────── */
export function DataTable({ data, columns, rowKey = (_, i) => i, onRowClick, onSelectRow, pageSize = 10, isLoading = false, emptyMessage = "No data", className, }) {
    const [sortKey, setSortKey] = useState(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [selectedKey, setSelectedKey] = useState(null);
    function toggleSort(col) {
        if (!col.sortable)
            return;
        setSortKey((prev) => prev === col.accessor ? col.accessor : col.accessor);
        setSortAsc((prev) => (col.accessor === sortKey ? !prev : true));
    }
    const sorted = useMemo(() => {
        if (!sortKey)
            return data;
        const accessor = typeof sortKey === "function"
            ? sortKey
            : (row) => row[sortKey];
        return [...data].sort((a, b) => {
            const av = accessor(a);
            const bv = accessor(b);
            if (av === bv)
                return 0;
            if (av === undefined || av === null)
                return 1;
            if (bv === undefined || bv === null)
                return -1;
            return (av > bv ? 1 : -1) * (sortAsc ? 1 : -1);
        });
    }, [data, sortKey, sortAsc]);
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(sorted.length / pageSize);
    const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);
    function go(delta) {
        setPage((p) => Math.max(0, Math.min(totalPages - 1, p + delta)));
    }
    React.useEffect(() => {
        setPage(0);
    }, [sorted.length]);
    function handleRowClick(row, index) {
        const key = rowKey(row, index);
        setSelectedKey(key);
        onSelectRow?.(row);
        onRowClick?.(row);
    }
    return (_jsxs("div", { className: clsx("w-full", className), children: [_jsx("div", { className: "overflow-x-auto rounded-2xl shadow-sm", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-700", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-800", children: _jsx("tr", { children: columns.map((col, idx) => (_jsx("th", { scope: "col", className: clsx("px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 select-none", col.headerClass, col.sortable && "cursor-pointer"), onClick: () => toggleSort(col), children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [col.header, col.sortable && (_jsx(ChevronsUpDown, { className: clsx("h-4 w-4 transition-transform", sortKey === col.accessor
                                                    ? sortAsc
                                                        ? "-rotate-180"
                                                        : ""
                                                    : "opacity-20") }))] }) }, idx))) }) }), _jsx("tbody", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "py-8 text-center text-gray-500 dark:text-gray-400", children: _jsx(Loader2, { className: "mx-auto h-6 w-6 animate-spin" }) }) })) : pageData.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "py-6 text-center text-gray-500 dark:text-gray-400", children: emptyMessage }) })) : (pageData.map((row, i) => {
                                const key = rowKey(row, i);
                                return (_jsx(Fragment, { children: _jsx("tr", { className: clsx("hover:bg-gray-50 dark:hover:bg-gray-800", (onSelectRow || onRowClick) && "cursor-pointer", selectedKey === key && "bg-blue-50 dark:bg-blue-900/30"), onClick: () => handleRowClick(row, i), children: columns.map((col, ci) => (_jsx("td", { className: clsx("whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100", col.cellClass), children: typeof col.accessor === "function"
                                                ? col.accessor(row)
                                                : row[col.accessor] }, ci))) }) }, key));
                            })) })] }) }), totalPages > 1 && (_jsxs("div", { className: "mt-3 flex items-center justify-center gap-2", children: [_jsx("button", { disabled: page === 0, onClick: () => go(-1), className: "rounded-full p-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700", children: _jsx(ChevronLeft, { className: "h-5 w-5" }) }), _jsxs("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: [page + 1, " / ", totalPages] }), _jsx("button", { disabled: page >= totalPages - 1, onClick: () => go(1), className: "rounded-full p-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700", children: _jsx(ChevronRight, { className: "h-5 w-5" }) })] }))] }));
}
export default DataTable;
//# sourceMappingURL=DataTable.js.map