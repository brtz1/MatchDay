import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";
import { teamUrl, loadGameUrl } from "@/utils/paths";
/* ── Component ───────────────────────────────────────────────────────── */
export default function TransferMarketPage() {
    const { currentTeamId, currentSaveGameId } = useTeamContext(); // 🧠 include saveGameId
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [filter, setFilter] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    // Redirect if no save loaded
    useEffect(() => {
        if (!currentTeamId) {
            navigate(loadGameUrl);
        }
    }, [currentTeamId, navigate]);
    async function handleSearch() {
        setLoading(true);
        setError(null);
        try {
            const params = Object.entries(filter).reduce((acc, [key, value]) => {
                if (value !== undefined && value !== "") {
                    acc[key] = value;
                }
                return acc;
            }, {});
            if (!currentSaveGameId) {
                throw new Error("No saveGameId available");
            }
            params.saveGameId = currentSaveGameId;
            const { data } = await axios.get("/players/search", { params });
            setPlayers(data);
        }
        catch (err) {
            console.error(err);
            setError("Failed to fetch players.");
        }
        finally {
            setLoading(false);
        }
    }
    function handleBack() {
        if (currentTeamId) {
            navigate(teamUrl(currentTeamId));
        }
        else {
            navigate(loadGameUrl);
        }
    }
    function handleViewTeam() {
        if (selectedPlayer?.teamId) {
            navigate(teamUrl(selectedPlayer.teamId));
        }
    }
    const columns = useMemo(() => [
        { header: "Name", accessor: "name", sortable: true },
        { header: "Pos", accessor: "position", cellClass: "text-center" },
        {
            header: "Nat",
            accessor: (row) => row.nationality ? (_jsx("img", { src: getFlagUrl(row.nationality), alt: row.nationality, className: "mx-auto h-4 w-6" })) : (""),
            headerClass: "text-center w-12",
        },
        { header: "Rating", accessor: "rating", cellClass: "text-right" },
        {
            header: "Price",
            accessor: (row) => `€${row.price.toLocaleString()}`,
            cellClass: "text-right",
        },
        { header: "Team", accessor: "teamName", cellClass: "text-left" },
    ], []);
    if (!currentTeamId) {
        return (_jsx("div", { className: "p-12 flex justify-center", children: _jsx(ProgressBar, {}) }));
    }
    return (_jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Transfer Market" }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Search Players" }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: [_jsx("input", { placeholder: "Name", value: filter.name ?? "", onChange: (e) => setFilter({ ...filter, name: e.target.value }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsxs("select", { value: filter.position ?? "", onChange: (e) => setFilter({ ...filter, position: e.target.value || undefined }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: "", children: "Any Position" }), _jsx("option", { value: "GK", children: "GK" }), _jsx("option", { value: "DF", children: "DF" }), _jsx("option", { value: "MF", children: "MF" }), _jsx("option", { value: "AT", children: "AT" })] }), _jsx("input", { type: "number", placeholder: "Max Price (\u20AC)", value: filter.priceMax ?? "", onChange: (e) => setFilter({
                                    ...filter,
                                    priceMax: e.target.value ? Number(e.target.value) : undefined,
                                }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsx("input", { type: "number", placeholder: "Min Rating", value: filter.ratingMin ?? "", onChange: (e) => setFilter({
                                    ...filter,
                                    ratingMin: e.target.value ? Number(e.target.value) : undefined,
                                }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsx("input", { type: "number", placeholder: "Max Rating", value: filter.ratingMax ?? "", onChange: (e) => setFilter({
                                    ...filter,
                                    ratingMax: e.target.value ? Number(e.target.value) : undefined,
                                }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsx("input", { placeholder: "Nationality", value: filter.nationality ?? "", onChange: (e) => setFilter({ ...filter, nationality: e.target.value }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-4", children: [_jsx(AppButton, { onClick: handleSearch, children: "Search" }), _jsx(AppButton, { variant: "secondary", onClick: handleViewTeam, disabled: !selectedPlayer, children: "View Team" }), _jsx(AppButton, { variant: "secondary", onClick: handleBack, children: "Back" })] })] }), _jsx(AppCard, { children: loading ? (_jsx(ProgressBar, {})) : error ? (_jsx("p", { className: "text-red-500", children: error })) : (_jsx(DataTable, { data: players, columns: columns, pageSize: 15, onSelectRow: (row) => setSelectedPlayer(row), emptyMessage: "No players found matching filters." })) })] }));
}
//# sourceMappingURL=TransferMarketPage.js.map