import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/pages/CupLogPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/axios';
import CupBracket from '@/components/cup/CupBracket';
import { useGameState } from '@/store/GameStateStore';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
export default function CupLogPage() {
    const navigate = useNavigate();
    const { coachTeamId } = useGameState();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api
            .get('/cup/log')
            .then((res) => {
            const flat = res.data.flatMap((round) => round.matches.map((m) => ({
                id: m.id,
                homeTeamId: m.homeTeamId,
                awayTeamId: m.awayTeamId,
                homeTeam: m.homeTeam.name,
                awayTeam: m.awayTeam.name,
                homeGoals: m.homeTeam.goals,
                awayGoals: m.awayTeam.goals,
                matchdayNumber: round.matchdayNumber,
                stage: round.roundLabel,
            })));
            setMatches(flat);
        })
            .catch((err) => console.error('Failed to load cup log:', err))
            .finally(() => setLoading(false));
    }, []);
    return (_jsxs("div", { className: "relative flex flex-col gap-6 p-4 w-full min-h-screen bg-gradient-to-b from-blue-50 to-blue-100", children: [_jsx("div", { className: "absolute right-6 top-6 z-10", children: _jsx(AppButton, { variant: "secondary", onClick: () => coachTeamId
                        ? navigate(`/teams/${coachTeamId}`)
                        : navigate(-1), className: "!px-6 !py-2", children: "\u2190 Back" }) }), _jsx("h1", { className: "mb-4 text-3xl font-extrabold text-blue-700 dark:text-blue-300 tracking-tight drop-shadow-sm text-center uppercase", children: "Cup Bracket" }), _jsx(AppCard, { variant: "default", className: "w-full rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-200/80 shadow-lg dark:border-blue-900 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-800/80 p-0", children: _jsx("div", { className: "w-full rounded-xl bg-white/90 p-0 shadow-inner dark:bg-gray-950/60 overflow-x-auto min-h-[400px] flex items-center", children: loading ? (_jsx("div", { className: "flex w-full justify-center py-8", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500" }) })) : (_jsx(CupBracket, { matches: matches })) }) })] }));
}
//# sourceMappingURL=CupLogPage.js.map