import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getMatches, simulateMatch } from '../services/matches';
import { getTeams } from '../services/teamService';
import { getReferees } from '../services/referees';
export default function Matches() {
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [referees, setReferees] = useState([]);
    const [form, setForm] = useState({
        homeTeamId: 0,
        awayTeamId: 0,
        refereeId: 0,
    });
    useEffect(() => {
        fetchMatches();
        fetchTeams();
        fetchReferees();
    }, []);
    const fetchMatches = async () => {
        const data = await getMatches();
        setMatches(data);
    };
    const fetchTeams = async () => {
        const data = await getTeams();
        setTeams(data);
    };
    const fetchReferees = async () => {
        const data = await getReferees();
        setReferees(data);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        await simulateMatch(form);
        await fetchMatches();
        setForm({
            homeTeamId: 0,
            awayTeamId: 0,
            refereeId: 0,
        });
    };
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-3xl font-extrabold text-accent mb-4", children: "Match Simulation" }), _jsx("h2", { className: "text-xl font-bold text-accent mb-2", children: "Played Matches" }), _jsxs("table", { className: "border-collapse w-full mt-4 shadow rounded bg-white", children: [_jsx("thead", { className: "bg-accent text-primary", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "Home" }), _jsx("th", { className: "p-2", children: "Score" }), _jsx("th", { className: "p-2", children: "Away" }), _jsx("th", { className: "p-2", children: "Score" }), _jsx("th", { className: "p-2", children: "Date" })] }) }), _jsx("tbody", { children: matches.map(match => {
                            const home = teams.find(t => t.id === match.homeTeamId)?.name ?? 'Unknown';
                            const away = teams.find(t => t.id === match.awayTeamId)?.name ?? 'Unknown';
                            return (_jsxs("tr", { className: "hover:bg-gray-100", children: [_jsx("td", { className: "p-2", children: home }), _jsx("td", { className: "p-2", children: match.homeScore }), _jsx("td", { className: "p-2", children: away }), _jsx("td", { className: "p-2", children: match.awayScore }), _jsx("td", { className: "p-2", children: new Date(match.matchDate).toLocaleDateString() })] }, match.id));
                        }) })] }), _jsx("h2", { className: "text-xl font-bold text-accent mt-6 mb-2", children: "Simulate New Match" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 bg-white p-4 rounded shadow w-full max-w-md", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Home Team" }), _jsxs("select", { className: "border p-2 w-full rounded", value: form.homeTeamId, onChange: e => setForm({ ...form, homeTeamId: Number(e.target.value) }), required: true, children: [_jsx("option", { value: "", children: "Select Home Team" }), teams.map(team => (_jsx("option", { value: team.id, children: team.name }, team.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Away Team" }), _jsxs("select", { className: "border p-2 w-full rounded", value: form.awayTeamId, onChange: e => setForm({ ...form, awayTeamId: Number(e.target.value) }), required: true, children: [_jsx("option", { value: "", children: "Select Away Team" }), teams.map(team => (_jsx("option", { value: team.id, children: team.name }, team.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Referee" }), _jsxs("select", { className: "border p-2 w-full rounded", value: form.refereeId, onChange: e => setForm({ ...form, refereeId: Number(e.target.value) }), required: true, children: [_jsx("option", { value: "", children: "Select Referee" }), referees.map(ref => (_jsx("option", { value: ref.id, children: ref.name }, ref.id)))] })] }), _jsx("button", { type: "submit", className: "bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400", children: "Simulate Match" })] })] }));
}
//# sourceMappingURL=Matches.js.map