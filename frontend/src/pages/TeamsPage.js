import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
/* ── Services ───────────────────────────────────────────────────────────── */
import { getTeams } from "@/services/teamService";
/* ── UI ------------------------------------------------------------------- */
import { AppCard } from "@/components/common/AppCard";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";
/* ── Component ------------------------------------------------------------ */
export default function TeamsPage() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    /* Fetch teams on mount */
    useEffect(() => {
        (async () => {
            try {
                const raw = await getTeams();
                const normalised = raw.map((t) => ({
                    ...t,
                    country: t.country ?? "—",
                }));
                setTeams(normalised);
            }
            catch {
                setError("Failed to load teams");
            }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    /* Table columns */
    const columns = useMemo(() => [
        { header: "Name", accessor: "name", sortable: true },
        { header: "Country", accessor: "country", sortable: true },
        {
            header: "Budget (€)",
            accessor: (row) => row.budget.toLocaleString(),
            cellClass: "text-right",
            sortable: true,
        },
    ], []);
    /* Render */
    return (_jsxs("div", { className: "mx-auto flex max-w-4xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Teams Management" }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Existing Teams" }), loading ? (_jsx(ProgressBar, {})) : error ? (_jsx("p", { className: "text-red-500", children: error })) : (_jsx(DataTable, { data: teams, columns: columns, pageSize: 12, emptyMessage: "No teams yet." }))] })] }));
}
//# sourceMappingURL=TeamsPage.js.map