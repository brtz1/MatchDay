import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getPlayers } from '../services/players';
import { getPlayerStats, recordPlayerStats } from '../services/stats';
import { getMatches } from '../services/matches';
export default function Stats() {
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [stats, setStats] = useState([]);
    const [form, setForm] = useState({
        matchId: 0,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0
    });
    useEffect(() => {
        fetchPlayers();
        fetchMatches();
    }, []);
    const fetchPlayers = async () => {
        const data = await getPlayers();
        setPlayers(data);
    };
    const fetchMatches = async () => {
        const data = await getMatches();
        setMatches(data);
    };
    const handleSelectPlayer = async (playerId) => {
        setSelectedPlayer(playerId);
        const data = await getPlayerStats(playerId);
        setStats(data);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlayer)
            return;
        await recordPlayerStats({
            playerId: selectedPlayer,
            matchId: form.matchId,
            goals: form.goals,
            assists: form.assists,
            yellow: form.yellow,
            red: form.red
        });
        await handleSelectPlayer(selectedPlayer);
        setForm({ matchId: 0, goals: 0, assists: 0, yellow: 0, red: 0 });
    };
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-3xl font-extrabold text-accent mb-4", children: "Player Statistics" }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-2", children: "Select Player" }), _jsxs("select", { className: "border p-2 w-full rounded", value: selectedPlayer ?? '', onChange: e => handleSelectPlayer(Number(e.target.value)), children: [_jsx("option", { value: "", children: "Select Player" }), players.map(player => (_jsx("option", { value: player.id, children: player.name }, player.id)))] })] }), selectedPlayer && (_jsxs(_Fragment, { children: [_jsx("h2", { className: "text-xl font-bold text-accent mt-6 mb-2", children: "Match Stats" }), _jsxs("table", { className: "border-collapse w-full mt-4 shadow rounded bg-white", children: [_jsx("thead", { className: "bg-accent text-primary", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "Match" }), _jsx("th", { className: "p-2", children: "Goals" }), _jsx("th", { className: "p-2", children: "Assists" }), _jsx("th", { className: "p-2", children: "Yellow" }), _jsx("th", { className: "p-2", children: "Red" })] }) }), _jsx("tbody", { children: stats.map(stat => (_jsxs("tr", { className: "hover:bg-gray-100", children: [_jsxs("td", { className: "p-2", children: ["#", stat.matchId] }), _jsx("td", { className: "p-2", children: stat.goals }), _jsx("td", { className: "p-2", children: stat.assists }), _jsx("td", { className: "p-2", children: stat.yellow }), _jsx("td", { className: "p-2", children: stat.red })] }, stat.id))) })] }), _jsx("h2", { className: "text-xl font-bold text-accent mt-6 mb-2", children: "Record New Stats" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 bg-white p-4 rounded shadow w-full max-w-md", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Match" }), _jsxs("select", { className: "border p-2 w-full rounded", value: form.matchId, onChange: e => setForm({ ...form, matchId: Number(e.target.value) }), required: true, children: [_jsx("option", { value: "", children: "Select Match" }), matches.map(match => (_jsxs("option", { value: match.id, children: ["#", match.id] }, match.id)))] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Goals", value: form.goals, onChange: e => setForm({ ...form, goals: Number(e.target.value) }) }), _jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Assists", value: form.assists, onChange: e => setForm({ ...form, assists: Number(e.target.value) }) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Yellow Cards", value: form.yellow, onChange: e => setForm({ ...form, yellow: Number(e.target.value) }) }), _jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Red Cards", value: form.red, onChange: e => setForm({ ...form, red: Number(e.target.value) }) })] }), _jsx("button", { type: "submit", className: "bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400", children: "Record Stats" })] })] }))] }));
}
//# sourceMappingURL=Stats.js.map