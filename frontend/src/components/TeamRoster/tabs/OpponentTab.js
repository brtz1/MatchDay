import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getNextMatch, getOpponentInfo } from '@/services/teamService';
const COACH_TEAM_ID = 1;
export default function OpponentTab() {
    const [opponent, setOpponent] = useState(null);
    useEffect(() => {
        getNextMatch(COACH_TEAM_ID).then((match) => {
            if (!match)
                return;
            const opponentId = match.homeTeamId === COACH_TEAM_ID
                ? match.awayTeamId
                : match.homeTeamId;
            getOpponentInfo(opponentId).then(setOpponent);
        }).catch((err) => {
            console.error("Failed to load opponent:", err);
        });
    }, []);
    if (!opponent)
        return _jsx("p", { children: "Loading opponent..." });
    return (_jsxs("div", { children: [_jsx("p", { className: "font-bold text-accent mb-2", children: "Opponent" }), _jsxs("p", { children: ["Team: ", opponent.name] }), _jsxs("p", { children: ["Coach: ", opponent.coach?.name ?? "N/A"] }), _jsxs("p", { children: ["Morale: ", opponent.coach?.morale ?? "Unknown", "%"] }), _jsx("button", { className: "bg-primary text-black rounded px-2 py-1 mt-2", children: "View Fixtures" }), _jsx("button", { className: "bg-primary text-black rounded px-2 py-1 mt-2 ml-2", children: "View Roster" })] }));
}
//# sourceMappingURL=OpponentTab.js.map