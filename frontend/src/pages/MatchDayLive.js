import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import HalfTimePopup from './HalfTimePopup';
const socket = io('http://localhost:4000');
export default function MatchdayLive() {
    const [events, setEvents] = useState({});
    const [matches, setMatches] = useState([]);
    const [popupMatchId, setPopupMatchId] = useState(null);
    useEffect(() => {
        axios.get('/api/gamestate').then(async (gs) => {
            const md = await axios.get(`/api/match-events/${gs.data.currentMatchday}`);
            const allMatches = await axios.get(`/api/matches/${gs.data.currentMatchday}`);
            setMatches(allMatches.data);
            const grouped = {};
            for (const ev of md.data) {
                grouped[ev.matchId] = ev;
            }
            setEvents(grouped);
        });
        socket.on('match-event', (ev) => {
            if (ev.matchId) {
                setEvents((prev) => ({ ...prev, [ev.matchId]: ev }));
            }
        });
        return () => socket.off('match-event');
    }, []);
    const groupedByDivision = matches.reduce((acc, match) => {
        const div = match.division || 'Other';
        if (!acc[div])
            acc[div] = [];
        acc[div].push(match);
        return acc;
    }, {});
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Live Matchday Broadcast" }), Object.entries(groupedByDivision).map(([division, games]) => (_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: division }), games.map((match) => (_jsxs("div", { className: "flex items-center justify-between p-2 border rounded mb-2 cursor-pointer", onClick: () => setPopupMatchId(match.id), children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "px-2 py-1 rounded text-white", style: { backgroundColor: match.homeTeam.primaryColor }, children: match.homeTeam.name }), _jsxs("span", { className: "font-bold text-lg", children: [match.homeScore ?? 0, " x ", match.awayScore ?? 0] }), _jsx("span", { className: "px-2 py-1 rounded text-white", style: { backgroundColor: match.awayTeam.primaryColor }, children: match.awayTeam.name })] }), _jsx("div", { className: "text-sm italic text-gray-700", children: events[match.id]?.description ?? '' })] }, match.id)))] }, division))), popupMatchId && (_jsx(HalfTimePopup, { matchId: popupMatchId, onClose: () => setPopupMatchId(null) }))] }));
}
//# sourceMappingURL=MatchDayLive.js.map