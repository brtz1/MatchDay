import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
/* ── Services ─────────────────────────────────────────────────────── */
import api from "@/services/axios"; // ← use axios instance directly
import { getTeams } from "@/services/teamService";
/* ── UI components ────────────────────────────────────────────────── */
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";
/* ── Routing ───────────────────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";
import { teamUrl, matchUrl } from "@/utils/paths";
/* ── Endpoints (keep in sync with backend routes) ──────────────────── */
const MATCHES_ENDPOINT = "/matches";
const SIMULATE_ENDPOINT = (id) => `/matches/${id}/simulate`;
/* ── Local helpers ─────────────────────────────────────────────────── */
async function getMatchesHttp() {
    const { data } = await api.get(MATCHES_ENDPOINT);
    // Accept either raw array or { matches: [...] }
    return Array.isArray(data) ? data : (data?.matches ?? []);
}
async function simulateMatchHttp(id) {
    await api.post(SIMULATE_ENDPOINT(id));
}
export default function MatchesPage() {
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [form, setForm] = useState({
        homeTeamId: 0,
        awayTeamId: 0,
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        (async () => {
            try {
                const [m, t] = await Promise.all([getMatchesHttp(), getTeams()]);
                setMatches(m);
                setTeams(t);
            }
            catch {
                setError("Failed to load data.");
            }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    const teamName = (id) => teams.find((t) => t.id === id)?.name ?? "Unknown";
    async function handleSubmit(e) {
        e.preventDefault();
        if (form.homeTeamId === form.awayTeamId) {
            setError("Home and Away teams must differ.");
            return;
        }
        // Find the first unplayed match between these teams
        const target = matches.find((m) => !m.played &&
            m.homeTeamId === form.homeTeamId &&
            m.awayTeamId === form.awayTeamId);
        if (!target) {
            setError("No scheduled unplayed match found between these teams.");
            return;
        }
        setSubmitting(true);
        try {
            await simulateMatchHttp(target.id);
            const updated = await getMatchesHttp();
            setMatches(updated);
            setForm({ homeTeamId: 0, awayTeamId: 0 });
            setError(null);
        }
        catch {
            setError("Simulation failed.");
        }
        finally {
            setSubmitting(false);
        }
    }
    const columns = useMemo(() => [
        {
            header: "Home",
            accessor: (m) => (_jsx("button", { className: "text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200", onClick: () => navigate(teamUrl(m.homeTeamId)), children: m.homeTeam?.name ?? teamName(m.homeTeamId) })),
        },
        {
            header: "",
            accessor: (m) => m.homeGoals != null && m.awayGoals != null ? (_jsx("button", { className: "text-center font-semibold hover:underline", onClick: () => navigate(matchUrl(m.id)), children: `${m.homeGoals} – ${m.awayGoals}` })) : ("—"),
            cellClass: "text-center font-semibold",
        },
        {
            header: "Away",
            accessor: (m) => (_jsx("button", { className: "text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200", onClick: () => navigate(teamUrl(m.awayTeamId)), children: m.awayTeam?.name ?? teamName(m.awayTeamId) })),
        },
        {
            header: "Date",
            accessor: (m) => m.matchDate ? new Date(m.matchDate).toLocaleDateString() : "TBD",
        },
    ], [teams, navigate]);
    return (_jsxs("div", { className: "mx-auto flex max-w-5xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Match Simulation" }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Played Matches" }), loading ? (_jsx(ProgressBar, {})) : error ? (_jsx("p", { className: "text-red-500", children: error })) : (_jsx(DataTable, { data: matches.filter((m) => m.homeGoals !== null && m.awayGoals !== null), columns: columns, pageSize: 10, emptyMessage: "No matches played yet." }))] }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Simulate Scheduled Match" }), _jsxs("form", { onSubmit: handleSubmit, className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-semibold", children: "Home Team" }), _jsxs("select", { value: form.homeTeamId, onChange: (e) => setForm((f) => ({ ...f, homeTeamId: Number(e.target.value) })), required: true, className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: 0, children: "Select\u2026" }), teams.map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id)))] })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-semibold", children: "Away Team" }), _jsxs("select", { value: form.awayTeamId, onChange: (e) => setForm((f) => ({ ...f, awayTeamId: Number(e.target.value) })), required: true, className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: 0, children: "Select\u2026" }), teams.map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id)))] })] }), _jsx(AppButton, { type: "submit", isLoading: submitting, className: "sm:col-span-2", children: "Simulate Match" })] })] })] }));
}
//# sourceMappingURL=MatchesPage.js.map