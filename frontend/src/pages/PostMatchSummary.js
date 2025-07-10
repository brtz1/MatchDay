import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
export default function PostMatchSummary({ matchdayId }) {
    const [data, setData] = useState([]);
    useEffect(() => {
        axios.get(`/api/match-summary/${matchdayId}`).then((res) => setData(res.data));
    }, [matchdayId]);
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-xl font-bold mb-4", children: "Post-Match Summary" }), data.map((m) => (_jsxs("div", { className: "border rounded p-3 mb-4", children: [_jsxs("h2", { className: "text-md font-semibold mb-1", children: [m.home, " ", m.score, " ", m.away] }), m.events.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500", children: "No events" })) : (_jsx("ul", { className: "text-sm text-gray-700 pl-4 list-disc", children: m.events.map((e, idx) => (_jsxs("li", { children: [e.minute, "' - ", e.type, ": ", e.desc] }, idx))) }))] }, m.matchId)))] }));
}
//# sourceMappingURL=PostMatchSummary.js.map