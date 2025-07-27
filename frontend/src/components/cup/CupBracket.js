import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
const stages = [
    'Round of 128',
    'Round of 64',
    'Round of 32',
    'Round of 16',
    'Quarterfinal',
    'Semifinal',
    'Final',
];
export default function CupBracket({ matches }) {
    const navigate = useNavigate();
    const getMatchesByStage = (stage) => matches.filter((m) => m.stage === stage);
    return (_jsx("div", { className: "flex space-x-8 overflow-x-auto p-2 w-full justify-center", children: stages.map((stage) => {
            const matchesForStage = getMatchesByStage(stage);
            return (_jsxs("div", { className: "flex flex-col items-center min-w-[250px] max-w-[340px] bg-gradient-to-br from-blue-50 to-blue-200/70 rounded-2xl border border-blue-200 shadow-lg dark:border-blue-900 dark:from-blue-950 dark:to-blue-800/80 pb-4", children: [_jsx("div", { className: "w-full flex items-center justify-center rounded-t-2xl bg-blue-100 px-4 py-3 shadow-inner dark:bg-blue-900/60 mb-2", children: _jsx("h2", { className: "text-xl font-bold tracking-wide text-blue-700 dark:text-yellow-300 uppercase text-center", children: stage }) }), _jsx("div", { className: "w-full rounded-xl bg-white/90 p-0 shadow-inner dark:bg-gray-950/60", children: matchesForStage.length === 0 ? (_jsx("div", { className: "text-gray-400 text-center py-4", children: "No matches" })) : (_jsx("table", { className: "w-full text-sm", children: _jsx("tbody", { children: matchesForStage.map((match, idx) => (_jsxs("tr", { className: `transition-colors duration-100 cursor-pointer
                          ${idx % 2 === 0
                                        ? 'bg-blue-50 dark:bg-blue-900/30'
                                        : 'bg-blue-100/60 dark:bg-blue-950/30'}
                          hover:bg-yellow-100 dark:hover:bg-yellow-900/30`, onClick: () => navigate(`/teams/${match.homeTeam}`), children: [_jsx("td", { className: "py-2 px-2 w-[90px] text-[#0d223d] text-center font-semibold hover:text-yellow-700 truncate", title: match.homeTeam, onClick: e => {
                                                e.stopPropagation();
                                                navigate(`/teams/${match.homeTeam}`);
                                            }, style: { cursor: 'pointer' }, children: match.homeTeam }), _jsx("td", { className: "py-2 px-2 w-[16px] font-bold text-yellow-700 text-center align-middle", children: match.homeGoals !== null && match.awayGoals !== null
                                                ? `${match.homeGoals} - ${match.awayGoals}`
                                                : "-" }), _jsx("td", { className: "py-2 px-2 w-[90px] text-[#0d223d] text-center font-semibold hover:text-yellow-700 truncate", title: match.awayTeam, onClick: e => {
                                                e.stopPropagation();
                                                navigate(`/teams/${match.awayTeam}`);
                                            }, style: { cursor: 'pointer' }, children: match.awayTeam })] }, match.id))) }) })) })] }, stage));
        }) }));
}
//# sourceMappingURL=CupBracket.js.map