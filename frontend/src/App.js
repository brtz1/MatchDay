import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import TitlePage from './pages/TitlePage';
import TeamRoster from './pages/TeamRoster';
import MatchdayLive from './pages/MatchDayLive';
import StandingsPage from './pages/StandingsPage';
import TopPlayersPage from './pages/TopPlayersPage';
import PostMatchSummary from './pages/PostMatchSummary';
import CountrySelector from './pages/CountrySelector';
import LoadGamePage from './pages/LoadGamePage';
import DrawPage from './pages/DrawPage';
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(TitlePage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/" }) }), _jsx(Route, { path: "/new-game", element: _jsx(CountrySelector, {}) }), _jsx(Route, { path: "/team", element: _jsx(TeamRoster, {}) }), _jsx(Route, { path: "/load", element: _jsx(LoadGamePage, {}) }), _jsx(Route, { path: "/matchday", element: _jsx(MatchdayLive, {}) }), _jsx(Route, { path: "/standings", element: _jsx(StandingsPage, {}) }), _jsx(Route, { path: "/top-players", element: _jsx(TopPlayersPage, {}) }), _jsx(Route, { path: "/summary/:matchdayId", element: _jsx(PostMatchSummaryWrapper, {}) }), _jsx(Route, { path: "/draw", element: _jsx(DrawPage, {}) }), _jsx(Route, { path: "/teams/:id", element: _jsx(TeamRoster, {}) })] }));
}
function PostMatchSummaryWrapper() {
    const { matchdayId } = useParams();
    return _jsx(PostMatchSummary, { matchdayId: parseInt(matchdayId || '0') });
}
//# sourceMappingURL=App.js.map