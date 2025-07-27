import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getNextMatch } from "@/services/teamService";
import { useGameState } from "@/store/GameStateStore";
export default function GameTab({ teamId, teamName, morale }) {
    const [match, setMatch] = useState(null);
    const { gameStage, matchdayType } = useGameState();
    useEffect(() => {
        if (gameStage === "ACTION") {
            getNextMatch(teamId)
                .then(setMatch)
                .catch((err) => {
                console.error("Failed to load next match:", err);
            });
        }
    }, [teamId, gameStage]);
    if (gameStage !== "ACTION") {
        return (_jsxs("div", { children: [_jsx("p", { className: "mb-2 font-bold text-accent", children: "Matchday In Progress" }), _jsx("p", { children: "The match is currently being simulated." })] }));
    }
    if (!match)
        return _jsx("p", { children: "Loading next match..." });
    const kickoff = new Date(match.matchDate).toLocaleDateString();
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-2 font-bold text-accent", children: "Next Match" }), _jsxs("p", { children: ["Match ID: ", match.id] }), _jsxs("p", { children: ["Home Team ID: ", match.homeTeamId] }), _jsxs("p", { children: ["Away Team ID: ", match.awayTeamId] }), _jsxs("p", { children: ["Referee: ", match.refereeName ?? "Unknown"] }), _jsxs("p", { children: ["Matchday:", " ", match.matchdayNumber
                        ? `${match.matchdayNumber} (${match.matchdayType})`
                        : "TBD"] }), _jsxs("p", { children: ["Kickoff: ", kickoff] }), _jsx("hr", { className: "my-2" }), _jsxs("p", { children: ["Coach Morale: ", morale !== null ? `${morale}%` : "N/A"] })] }));
}
//# sourceMappingURL=GameTab.js.map