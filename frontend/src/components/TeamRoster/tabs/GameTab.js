import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getNextMatch } from '../../../services/team';
export default function GameTab({ teamName, budget, morale }) {
    const [match, setMatch] = useState(null);
    useEffect(() => {
        getNextMatch(1).then(setMatch);
    }, []);
    if (!match)
        return _jsx("p", { children: "Loading next match..." });
    const opponent = match.homeTeam.name === teamName
        ? match.awayTeam.name
        : match.homeTeam.name;
    return (_jsxs("div", { children: [_jsx("p", { className: "font-bold text-accent mb-2", children: "Next Match" }), _jsxs("p", { children: ["vs. ", opponent] }), _jsxs("p", { children: ["Referee: ", match.referee?.name ?? "Unknown"] }), _jsxs("p", { children: ["Matchday: ", match.matchday?.number, " (", match.matchday?.type, ")"] }), _jsxs("p", { children: ["Kickoff: ", new Date(match.matchDate).toLocaleDateString()] }), _jsx("hr", { className: "my-2" }), _jsxs("p", { children: ["Budget: \u20AC", budget.toLocaleString()] }), _jsxs("p", { children: ["Coach Morale: ", morale !== null ? `${morale}%` : "N/A"] })] }));
}
//# sourceMappingURL=GameTab.js.map