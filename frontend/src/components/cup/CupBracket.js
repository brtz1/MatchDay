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
    return (_jsx("div", { className: "flex space-x-8 overflow-x-auto p-2", children: stages.map((stage) => (_jsxs("div", { className: "flex flex-col min-w-[180px]", children: [_jsx("h2", { className: "text-lg font-semibold mb-2 text-center", children: stage }), getMatchesByStage(stage).map((match) => (_jsxs("div", { className: "bg-white border shadow-sm rounded-xl p-2 mb-2 hover:bg-yellow-100 cursor-pointer", children: [_jsx("div", { className: "text-sm font-semibold", onClick: () => navigate(`/teams/${match.homeTeam}`), children: match.homeTeam }), _jsx("div", { className: "text-sm font-semibold", onClick: () => navigate(`/teams/${match.awayTeam}`), children: match.awayTeam }), match.homeGoals !== null && match.awayGoals !== null && (_jsxs("div", { className: "text-sm text-center mt-1", children: [match.homeGoals, " - ", match.awayGoals] }))] }, match.id)))] }, stage))) }));
}
//# sourceMappingURL=CupBracket.js.map