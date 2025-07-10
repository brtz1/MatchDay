import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getTeams, createTeam } from '../services/teamService';
export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [form, setForm] = useState({ name: '', country: '', budget: 0 });
    useEffect(() => {
        fetchTeams();
    }, []);
    const fetchTeams = async () => {
        const data = await getTeams();
        setTeams(data);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        await createTeam(form);
        await fetchTeams();
        setForm({ name: '', country: '', budget: 0 });
    };
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-3xl font-extrabold text-accent mb-4", children: "Teams Management" }), _jsx("h2", { className: "text-xl font-bold text-accent mb-2", children: "Existing Teams" }), _jsxs("table", { className: "border-collapse w-full mt-4 shadow rounded bg-white", children: [_jsx("thead", { className: "bg-accent text-primary", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "Name" }), _jsx("th", { className: "p-2", children: "Country" }), _jsx("th", { className: "p-2", children: "Budget" })] }) }), _jsx("tbody", { children: teams.map(team => (_jsxs("tr", { className: "hover:bg-gray-100", children: [_jsx("td", { className: "p-2", children: team.name }), _jsx("td", { className: "p-2", children: team.country }), _jsx("td", { className: "p-2", children: team.budget.toLocaleString() })] }, team.id))) })] }), _jsx("h2", { className: "text-xl font-bold text-accent mt-6 mb-2", children: "Add New Team" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 mt-4 bg-white p-4 rounded shadow w-full max-w-md", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Name" }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Team Name", value: form.name, onChange: e => setForm({ ...form, name: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Country" }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Country", value: form.country, onChange: e => setForm({ ...form, country: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "Budget" }), _jsx("input", { className: "border p-2 w-full rounded", type: "number", placeholder: "Budget", value: form.budget, onChange: e => setForm({ ...form, budget: Number(e.target.value) }), required: true })] }), _jsx("button", { type: "submit", className: "bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400", children: "Add Team" })] })] }));
}
//# sourceMappingURL=Teams.js.map