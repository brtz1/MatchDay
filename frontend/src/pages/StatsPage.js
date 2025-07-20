import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { useEffect, useState } from "react";
import playersService from "@/services/playersService";
import matchService from "@/services/matchService";
import statsService from "@/services/statsService";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";
/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function StatsPage() {
    /* ── State ------------------------------------------------------------- */
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [stats, setStats] = useState([]);
    const [form, setForm] = useState({
        matchId: 0,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    /* ── Bootstrap --------------------------------------------------------- */
    useEffect(() => {
        async function bootstrap() {
            try {
                const [p, m] = await Promise.all([
                    playersService.getPlayers(),
                    matchService.getMatches(),
                ]);
                setPlayers(p);
                setMatches(m);
            }
            catch {
                setError("Failed to load players or matches");
            }
            finally {
                setLoading(false);
            }
        }
        bootstrap();
    }, []);
    /* ── Select player → fetch stats -------------------------------------- */
    async function handleSelectPlayer(id) {
        setSelectedPlayer(id);
        setLoading(true);
        try {
            const s = await statsService.getPlayerStats(id);
            setStats(s);
        }
        catch {
            setError("Failed to fetch player stats");
        }
        finally {
            setLoading(false);
        }
    }
    /* ── Submit stats ------------------------------------------------------ */
    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedPlayer)
            return;
        setSubmitting(true);
        try {
            await statsService.recordPlayerStats({
                playerId: selectedPlayer,
                ...form,
            });
            handleSelectPlayer(selectedPlayer);
            setForm({ matchId: 0, goals: 0, assists: 0, yellow: 0, red: 0 });
        }
        catch {
            setError("Failed to record stats");
        }
        finally {
            setSubmitting(false);
        }
    }
    /* ── Table columns ----------------------------------------------------- */
    const columns = React.useMemo(() => [
        { header: "Match", accessor: (r) => `#${r.matchId}` },
        {
            header: "Goals",
            accessor: "goals",
            cellClass: "text-right",
        },
        {
            header: "Assists",
            accessor: "assists",
            cellClass: "text-right",
        },
        {
            header: "Yellow",
            accessor: "yellow",
            cellClass: "text-right",
        },
        {
            header: "Red",
            accessor: "red",
            cellClass: "text-right",
        },
    ], []);
    /* ── Render ------------------------------------------------------------ */
    return (_jsxs("div", { className: "mx-auto flex max-w-5xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Player Statistics" }), _jsxs(AppCard, { children: [_jsx("label", { className: "mb-2 block font-semibold", children: "Select Player" }), _jsxs("select", { className: "w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", value: selectedPlayer ?? "", onChange: (e) => handleSelectPlayer(Number(e.target.value)), children: [_jsx("option", { value: "", children: "\u2014 choose \u2014" }), players.map((p) => (_jsx("option", { value: p.id, children: p.name }, p.id)))] })] }), selectedPlayer && (_jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Match Stats" }), loading ? (_jsx(ProgressBar, {})) : (_jsx(DataTable, { data: stats, columns: columns, emptyMessage: "No stats recorded.", pageSize: 10 }))] })), selectedPlayer && (_jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Record New Stats" }), _jsxs("form", { onSubmit: handleSubmit, className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("select", { value: form.matchId, onChange: (e) => setForm({ ...form, matchId: Number(e.target.value) }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800 sm:col-span-2", required: true, children: [_jsx("option", { value: 0, children: "Select match" }), matches.map((m) => (_jsxs("option", { value: m.id, children: ["#", m.id] }, m.id)))] }), _jsx("input", { type: "number", placeholder: "Goals", value: form.goals, onChange: (e) => setForm({ ...form, goals: Number(e.target.value) }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsx("input", { type: "number", placeholder: "Assists", value: form.assists, onChange: (e) => setForm({ ...form, assists: Number(e.target.value) }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsx("input", { type: "number", placeholder: "Yellow Cards", value: form.yellow, onChange: (e) => setForm({ ...form, yellow: Number(e.target.value) }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsx("input", { type: "number", placeholder: "Red Cards", value: form.red, onChange: (e) => setForm({ ...form, red: Number(e.target.value) }), className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800" }), _jsx(AppButton, { type: "submit", isLoading: submitting, className: "sm:col-span-2", children: "Record Stats" })] })] })), error && (_jsx("p", { className: "text-red-500", children: error }))] }));
}
//# sourceMappingURL=StatsPage.js.map