import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
/* ── Services ─────────────────────────────────────────────────────── */
import matchService from "@/services/matchService";
import { getTeams } from "@/services/teamService";
import refereeService from "@/services/refereeService";
/* ── UI components ────────────────────────────────────────────────── */
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import DataTable from "@/components/common/DataTable";
import { ProgressBar } from "@/components/common/ProgressBar";
/* ── Routing ───────────────────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";
import { teamUrl, matchUrl } from "@/utils/paths";
/* ── Component ─────────────────────────────────────────────────────── */
export default function MatchesPage() {
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [referees, setReferees] = useState([]);
    const [form, setForm] = useState({
        homeTeamId: 0,
        awayTeamId: 0,
        refereeId: 0,
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        (async () => {
            try {
                const [m, t, r] = await Promise.all([
                    matchService.getMatches(),
                    getTeams(),
                    refereeService.getReferees(),
                ]);
                setMatches(m);
                setTeams(t);
                setReferees(r);
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
        setSubmitting(true);
        try {
            await matchService.simulateMatch(form); // ✅ updated to pass full form
            const updated = await matchService.getMatches();
            setMatches(updated);
            setForm({ homeTeamId: 0, awayTeamId: 0, refereeId: 0 });
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
            accessor: (m) => (_jsx("button", { className: "text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200", onClick: () => navigate(teamUrl(m.homeTeamId)), children: teamName(m.homeTeamId) })),
        },
        {
            header: "",
            accessor: (m) => m.homeScore != null && m.awayScore != null ? (_jsx("button", { className: "text-center font-semibold hover:underline", onClick: () => navigate(matchUrl(m.id)), children: `${m.homeScore} – ${m.awayScore}` })) : ("—"),
            cellClass: "text-center font-semibold",
        },
        {
            header: "Away",
            accessor: (m) => (_jsx("button", { className: "text-blue-600 underline hover:text-blue-800 dark:text-yellow-300 dark:hover:text-yellow-200", onClick: () => navigate(teamUrl(m.awayTeamId)), children: teamName(m.awayTeamId) })),
        },
        {
            header: "Date",
            accessor: (m) => m.matchDate ? new Date(m.matchDate).toLocaleDateString() : "TBD",
        },
    ], [teams, navigate]);
    return (_jsxs("div", { className: "mx-auto flex max-w-5xl flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Match Simulation" }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Played Matches" }), loading ? (_jsx(ProgressBar, {})) : error ? (_jsx("p", { className: "text-red-500", children: error })) : (_jsx(DataTable, { data: matches, columns: columns, pageSize: 10, emptyMessage: "No matches played yet." }))] }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Simulate New Match" }), _jsxs("form", { onSubmit: handleSubmit, className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-semibold", children: "Home Team" }), _jsxs("select", { value: form.homeTeamId, onChange: (e) => setForm((f) => ({ ...f, homeTeamId: Number(e.target.value) })), required: true, className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: 0, children: "Select\u2026" }), teams.map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id)))] })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-semibold", children: "Away Team" }), _jsxs("select", { value: form.awayTeamId, onChange: (e) => setForm((f) => ({ ...f, awayTeamId: Number(e.target.value) })), required: true, className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: 0, children: "Select\u2026" }), teams.map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id)))] })] }), _jsxs("label", { className: "flex flex-col gap-1 sm:col-span-2", children: [_jsx("span", { className: "font-semibold", children: "Referee" }), _jsxs("select", { value: form.refereeId, onChange: (e) => setForm((f) => ({ ...f, refereeId: Number(e.target.value) })), required: true, className: "rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: 0, children: "Select\u2026" }), referees.map((r) => (_jsx("option", { value: r.id, children: r.name }, r.id)))] })] }), _jsx(AppButton, { type: "submit", isLoading: submitting, className: "sm:col-span-2", children: "Simulate Match" })] })] })] }));
}
//# sourceMappingURL=MatchesPage.js.map