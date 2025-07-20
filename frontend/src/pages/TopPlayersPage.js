import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/services/axios";
import DataTable from "@/components/common/DataTable";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";
import { playerUrl } from "@/utils/paths"; // ✅ centralized route
/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function TopPlayersPage() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        axios
            .get("/stats/top")
            .then(({ data }) => setPlayers(data))
            .catch(() => setError("Failed to fetch player stats"))
            .finally(() => setLoading(false));
    }, []);
    const columns = React.useMemo(() => [
        {
            header: "Name",
            accessor: (row) => (_jsx("button", { className: "text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200", onClick: () => navigate(playerUrl(row.id)), children: row.name })),
            sortable: true,
        },
        {
            header: "Pos",
            accessor: "position",
            cellClass: "text-center",
            sortable: true,
        },
        {
            header: "Nat",
            accessor: (row) => row.nationality ? (_jsx("img", { src: getFlagUrl(row.nationality), alt: row.nationality, className: "mx-auto h-4 w-6" })) : (""),
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
    ], [navigate]);
    return (_jsxs("div", { className: "mx-auto flex max-w-4xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Player Statistics Leaders" }), _jsx(AppCard, { children: loading ? (_jsx(ProgressBar, {})) : error ? (_jsx("p", { className: "text-red-500", children: error })) : (_jsx(DataTable, { data: players, columns: columns, pageSize: 20, emptyMessage: "No stats found." })) })] }));
}
//# sourceMappingURL=TopPlayersPage.js.map