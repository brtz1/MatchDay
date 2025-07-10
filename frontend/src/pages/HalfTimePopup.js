import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
export default function HalfTimePopup({ matchId, onClose, }) {
    const [data, setData] = useState(null);
    const [selectedOut, setSelectedOut] = useState(null);
    const [selectedIn, setSelectedIn] = useState(null);
    useEffect(() => {
        axios.get(`/api/match-state/${matchId}`).then((res) => {
            setData(res.data);
        });
    }, [matchId]);
    function playerLabel(pid, players, events) {
        const p = players.find((pl) => pl.id === pid);
        const e = events.find((ev) => ev.playerId === pid);
        const highlight = e?.eventType === 'INJURY'
            ? 'bg-orange-300'
            : e?.eventType === 'RED_CARD'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200';
        return (_jsxs("span", { className: `px-2 py-1 rounded ${highlight}`, children: [p?.name ?? `#${pid}`, " (", p?.position ?? '?', ")"] }));
    }
    async function makeSub() {
        if (!selectedOut || !selectedIn)
            return;
        try {
            await axios.post('/api/substitute', {
                matchId,
                team: 'home', // assumes user controls home team
                outPlayerId: selectedOut,
                inPlayerId: selectedIn,
            });
            await axios.post('/api/resume-match', { matchId });
            onClose();
        }
        catch (e) {
            console.error(e);
        }
    }
    if (!data)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center", children: _jsxs("div", { className: "bg-white rounded p-6 w-[600px] max-h-[90vh] overflow-y-auto relative", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Half-Time Substitutions" }), _jsx("h3", { className: "font-semibold mt-2 mb-1", children: "Current Lineup" }), _jsx("div", { className: "flex flex-wrap gap-2 mb-4", children: data.homeLineup.map((pid) => (_jsx("button", { onClick: () => setSelectedOut(pid), className: `border px-2 py-1 rounded ${selectedOut === pid ? 'bg-blue-300' : ''}`, children: playerLabel(pid, data.homePlayers, data.events) }, pid))) }), _jsx("h3", { className: "font-semibold mt-2 mb-1", children: "Reserves" }), _jsx("div", { className: "flex flex-wrap gap-2 mb-4", children: data.homeReserves.map((pid) => (_jsx("button", { onClick: () => setSelectedIn(pid), className: `border px-2 py-1 rounded ${selectedIn === pid ? 'bg-green-300' : ''}`, children: playerLabel(pid, data.homePlayers, data.events) }, pid))) }), _jsx("button", { className: "bg-blue-600 text-white px-4 py-2 rounded mr-2", onClick: makeSub, children: "Confirm Sub & Resume Match" }), _jsx("button", { className: "absolute top-2 right-2 text-gray-500 hover:text-black", onClick: onClose, children: "\u2715" })] }) }));
}
//# sourceMappingURL=HalfTimePopup.js.map