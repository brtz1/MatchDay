import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
export default function StandingsPage() {
    const [data, setData] = useState([]);
    useEffect(() => {
        axios.get('/api/standings').then((res) => setData(res.data));
    }, []);
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "League Standings" }), data.map((div) => (_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: div.division }), _jsxs("table", { className: "w-full text-sm border", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-2", children: "Team" }), _jsx("th", { children: "Pts" }), _jsx("th", { children: "Pl" }), _jsx("th", { children: "W" }), _jsx("th", { children: "D" }), _jsx("th", { children: "L" }), _jsx("th", { children: "GF" }), _jsx("th", { children: "GA" })] }) }), _jsx("tbody", { children: div.teams.map((team, idx) => (_jsxs("tr", { className: "text-center border-t", children: [_jsx("td", { className: "text-left px-2", children: team.name }), _jsx("td", { children: team.points }), _jsx("td", { children: team.played }), _jsx("td", { children: team.wins }), _jsx("td", { children: team.draws }), _jsx("td", { children: team.losses }), _jsx("td", { children: team.goalsFor }), _jsx("td", { children: team.goalsAgainst })] }, idx))) })] })] }, div.division)))] }));
}
//# sourceMappingURL=StandingsPage.js.map