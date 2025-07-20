import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { useEffect, useState } from "react";
import playersService from "@/services/playersService";
import { getTeams } from "@/services/teamService";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";
/* ── Routing ───────────────────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";
import { teamUrl } from "@/utils/paths"; // ✅ centralized team route
/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function PlayersPage() {
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [form, setForm] = useState({
        name: "",
        age: 18,
        position: "MF",
        rating: 50,
        value: 0,
        salary: 0,
        teamId: undefined,
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        async function bootstrap() {
            try {
                const [p, t] = await Promise.all([
                    playersService.getPlayers(),
                    getTeams(),
                ]);
                setPlayers(p);
                setTeams(t);
            }
            catch {
                setError("Failed to load players or teams");
            }
            finally {
                setLoading(false);
            }
        }
        bootstrap();
    }, []);
    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await playersService.createPlayer(form);
            setPlayers(await playersService.getPlayers());
            setForm({
                name: "",
                age: 18,
                position: "MF",
                rating: 50,
                value: 0,
                salary: 0,
                teamId: undefined,
            });
        }
        catch {
            setError("Failed to create player");
        }
        finally {
            setSubmitting(false);
        }
    }
    const columns = React.useMemo(() => [
        { header: "Name", accessor: "name", sortable: true },
        { header: "Age", accessor: "age", sortable: true, cellClass: "text-right" },
        { header: "Pos", accessor: "position", sortable: true, cellClass: "text-center" },
        { header: "Rating", accessor: "rating", sortable: true, cellClass: "text-right" },
        {
            header: "Value",
            accessor: (row) => `€${row.value.toLocaleString()}`,
            sortable: true,
            cellClass: "text-right",
        },
        {
            header: "Salary",
            accessor: (row) => `€${row.salary.toLocaleString()}`,
            sortable: true,
            cellClass: "text-right",
        },
        {
            header: "Team",
            accessor: (row) => row.team ? (_jsx("button", { className: "text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200", onClick: () => navigate(teamUrl(row.team.id)), children: row.team.name })) : ("Free Agent"),
            sortable: true,
        },
    ], [navigate]);
    return (_jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Players Management" }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Existing Players" }), loading ? (_jsx(ProgressBar, {})) : error ? (_jsx("p", { className: "text-red-500", children: error })) : (_jsx(DataTable, { data: players, columns: columns, pageSize: 15, emptyMessage: "No players available." }))] }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Add New Player" }), _jsxs("form", { onSubmit: handleSubmit, className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: [_jsx("input", { className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", placeholder: "Name", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true }), _jsx("input", { type: "number", className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", placeholder: "Age", value: form.age, min: 15, max: 45, onChange: (e) => setForm({ ...form, age: Number(e.target.value) }), required: true }), _jsxs("select", { value: form.position, onChange: (e) => setForm({ ...form, position: e.target.value }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: "GK", children: "GK" }), _jsx("option", { value: "DF", children: "DF" }), _jsx("option", { value: "MF", children: "MF" }), _jsx("option", { value: "AT", children: "AT" })] }), _jsx("input", { type: "number", className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", placeholder: "Rating", value: form.rating, min: 1, max: 99, onChange: (e) => setForm({ ...form, rating: Number(e.target.value) }), required: true }), _jsx("input", { type: "number", className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", placeholder: "Value (\u20AC)", value: form.value, onChange: (e) => setForm({ ...form, value: Number(e.target.value) }), required: true }), _jsx("input", { type: "number", className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", placeholder: "Salary (\u20AC)", value: form.salary, onChange: (e) => setForm({ ...form, salary: Number(e.target.value) }), required: true }), _jsxs("select", { value: form.teamId ?? "", onChange: (e) => setForm({
                                    ...form,
                                    teamId: e.target.value ? Number(e.target.value) : undefined,
                                }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 lg:col-span-3", children: [_jsx("option", { value: "", children: "Free Agent" }), teams.map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id)))] }), _jsx(AppButton, { type: "submit", isLoading: submitting, className: "lg:col-span-3", children: "Add Player" })] })] })] }));
}
//# sourceMappingURL=PlayersPage.js.map