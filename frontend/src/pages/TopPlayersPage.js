import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
export default function TopPlayersPage() {
    const [players, setPlayers] = useState([]);
    useEffect(() => {
        axios.get('/api/stats').then((res) => setPlayers(res.data));
    }, []);
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Player Stats" }), _jsxs("table", { className: "w-full text-sm border", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-2", children: "Name" }), _jsx("th", { children: "Pos" }), _jsx("th", { children: "Nat" }), _jsx("th", { children: "G" }), _jsx("th", { children: "A" }), _jsx("th", { children: "Y" }), _jsx("th", { children: "R" })] }) }), _jsx("tbody", { children: players.map((p) => (_jsxs("tr", { className: "text-center border-t", children: [_jsx("td", { className: "text-left px-2", children: p.name }), _jsx("td", { children: p.position }), _jsx("td", { children: p.nationality }), _jsx("td", { children: p.goals }), _jsx("td", { children: p.assists }), _jsx("td", { children: p.yellow }), _jsx("td", { children: p.red })] }, p.id))) })] })] }));
}
//# sourceMappingURL=TopPlayersPage.js.map