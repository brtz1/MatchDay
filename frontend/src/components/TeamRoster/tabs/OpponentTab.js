import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getNextMatch, getOpponentInfo } from '../../../services/team';
export default function OpponentTab() {
    const [opponent, setOpponent] = useState(null);
    useEffect(() => {
        // first load the next match
        getNextMatch(1).then(match => {
            if (!match)
                return;
            // get opponent ID
            const oppId = match.homeTeam.id === 1 ? match.awayTeam.id : match.homeTeam.id;
            getOpponentInfo(oppId).then(setOpponent);
        });
    }, []);
    if (!opponent)
        return _jsx("p", { children: "Loading opponent..." });
    return (_jsxs("div", { children: [_jsx("p", { className: "font-bold text-accent mb-2", children: "Opponent" }), _jsxs("p", { children: ["Team: ", opponent.name] }), _jsxs("p", { children: ["Coach: ", opponent.coach?.name ?? "N/A"] }), _jsxs("p", { children: ["Morale: ", opponent.coach?.morale ?? "Unknown", "%"] }), _jsx("button", { className: "bg-primary text-black rounded px-2 py-1 mt-2", children: "View Fixtures" }), _jsx("button", { className: "bg-primary text-black rounded px-2 py-1 mt-2 ml-2", children: "View Roster" })] }));
}
//# sourceMappingURL=OpponentTab.js.map