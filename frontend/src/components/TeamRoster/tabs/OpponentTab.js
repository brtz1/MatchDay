import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useGameState } from '@/store/GameStateStore';
import { getNextMatch, getOpponentInfo } from '@/services/teamService';
export default function OpponentTab() {
    const { coachTeamId } = useGameState();
    const [opponent, setOpponent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let canceled = false;
        async function fetchOpponent() {
            if (!coachTeamId) {
                if (!canceled)
                    setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const match = await getNextMatch(coachTeamId);
                if (!match) {
                    if (!canceled)
                        setOpponent(null);
                    return;
                }
                const opponentId = match.homeTeamId === coachTeamId
                    ? match.awayTeamId
                    : match.homeTeamId;
                const opp = await getOpponentInfo(opponentId);
                if (!canceled)
                    setOpponent(opp);
            }
            catch (err) {
                console.error('Failed to load opponent:', err);
                if (!canceled)
                    setError('Failed to load opponent');
            }
            finally {
                if (!canceled)
                    setLoading(false);
            }
        }
        fetchOpponent();
        return () => { canceled = true; };
    }, [coachTeamId]);
    if (loading)
        return _jsx("p", { children: "Loading opponent..." });
    if (error)
        return _jsx("p", { className: "text-red-500", children: error });
    if (!opponent)
        return _jsx("p", { children: "No upcoming match." });
    return (_jsxs("div", { children: [_jsx("p", { className: "font-bold text-accent mb-2", children: "Opponent" }), _jsxs("p", { children: ["Team: ", opponent.name] }), _jsxs("p", { children: ["Coach: ", opponent.coach?.name ?? 'N/A'] }), _jsxs("p", { children: ["Morale:", ' ', opponent.coach?.morale != null
                        ? `${opponent.coach.morale}%`
                        : 'Unknown'] }), _jsx("button", { className: "bg-primary text-black rounded px-2 py-1 mt-2", children: "View Fixtures" }), _jsx("button", { className: "bg-primary text-black rounded px-2 py-1 mt-2 ml-2", children: "View Roster" })] }));
}
//# sourceMappingURL=OpponentTab.js.map