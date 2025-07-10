import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getPlayers, createPlayer } from '../services/players';
import { getTeams } from '../services/teamService';
export default function Players() {
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [form, setForm] = useState({
        name: '',
        age: 0,
        position: '',
        rating: 0,
        value: 0,
        salary: 0,
        teamId: undefined
    });
    useEffect(() => {
        fetchPlayers();
        fetchTeams();
    }, []);
    const fetchPlayers = async () => {
        const data = await getPlayers();
        setPlayers(data);
    };
    const fetchTeams = async () => {
        const data = await getTeams();
        setTeams(data);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        await createPlayer(form);
        await fetchPlayers();
        setForm({
            name: '',
            age: 0,
            position: '',
            rating: 0,
            value: 0,
            salary: 0,
            teamId: undefined
        });
    };
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-3xl font-extrabold text-accent mb-4", children: "Players Management" }), _jsx("h2", { className: "text-xl font-bold text-accent mb-2", children: "Existing Players" }), _jsxs("table", { className: "border-collapse w-full mt-4 shadow rounded bg-white", children: [_jsx("thead", { className: "bg-accent text-primary", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "Name" }), _jsx("th", { className: "p-2", children: "Age" }), _jsx("th", { className: "p-2", children: "Position" }), _jsx("th", { className: "p-2", children: "Rating" }), _jsx("th", { className: "p-2", children: "Value" }), _jsx("th", { className: "p-2", children: "Salary" }), _jsx("th", { className: "p-2", children: "Team" })] }) }), _jsx("tbody", { children: players.map(player => (_jsxs("tr", { className: "hover:bg-gray-100", children: [_jsx("td", { className: "p-2", children: player.name }), _jsx("td", { className: "p-2", children: player.age }), _jsx("td", { className: "p-2", children: player.position }), _jsx("td", { className: "p-2", children: player.rating }), _jsx("td", { className: "p-2", children: player.value.toLocaleString() }), _jsx("td", { className: "p-2", children: player.salary.toLocaleString() }), _jsx("td", { className: "p-2", children: player.team?.name ?? 'Free Agent' })] }, player.id))) })] }), _jsx("h2", { className: "text-xl font-bold text-accent mt-6 mb-2", children: "Add New Player" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 mt-4 bg-white p-4 rounded shadow w-full max-w-md", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Name" }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Player Name", value: form.name, onChange: e => setForm({ ...form, name: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Age" }), _jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Age", value: form.age, onChange: e => setForm({ ...form, age: Number(e.target.value) }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Position" }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Position", value: form.position, onChange: e => setForm({ ...form, position: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Rating" }), _jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Rating", value: form.rating, onChange: e => setForm({ ...form, rating: Number(e.target.value) }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Value" }), _jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Value", value: form.value, onChange: e => setForm({ ...form, value: Number(e.target.value) }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Salary" }), _jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Salary", value: form.salary, onChange: e => setForm({ ...form, salary: Number(e.target.value) }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Assign to Team" }), _jsxs("select", { className: "border p-2 w-full rounded", value: form.teamId ?? '', onChange: e => setForm({ ...form, teamId: e.target.value ? Number(e.target.value) : undefined }), children: [_jsx("option", { value: "", children: "Free Agent" }), teams.map(team => (_jsx("option", { value: team.id, children: team.name }, team.id)))] })] }), _jsx("button", { type: "submit", className: "bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400", children: "Add Player" })] })] }));
}
//# sourceMappingURL=Players.js.map