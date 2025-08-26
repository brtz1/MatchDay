import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
/* ── Pages (eager-loaded) */
import TitlePage from "@/pages/TitlePage";
import CountrySelectionPage from "@/pages/CountrySelectionPage";
import DrawPage from "@/pages/DrawPage";
import LoadGamePage from "@/pages/LoadGamePage";
import TeamRosterPage from "@/pages/TeamRosterPage";
import MatchdayLivePage from "@/pages/MatchDayLivePage";
import StandingsPage from "@/pages/StandingsPage";
import TopPlayersPage from "@/pages/TopPlayersPage";
import TransferMarketPage from "@/pages/TransferMarketPage";
import CupLogPage from "@/pages/CupLogPage";
import PostMatchSummary from "@/pages/PostMatchSummary";
/* ── Admin / utilities (lazy-loaded) */
const MatchesPage = React.lazy(() => import("@/pages/MatchesPage"));
const PlayersPage = React.lazy(() => import("@/pages/PlayersPage"));
const TeamsPage = React.lazy(() => import("@/pages/TeamsPage"));
const StatsPage = React.lazy(() => import("@/pages/StatsPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
/* ── Common UI */
import TopNavBar from "@/components/common/TopNavBar";
import { ProgressBar } from "@/components/common/ProgressBar";
/* ── Game state */
import { useGameState } from "@/store/GameStateStore";
/* ── Route constants */
import { teamUrl, matchdayUrl, standingsUrl, topPlayersUrl, transferMarketUrl, cupUrl, newGameUrl, drawPageUrl, loadGameUrl, settingsUrl, titlePageUrl, adminMatchesUrl, adminPlayersUrl, adminTeamsUrl, adminStatsUrl, resultsUrl, } from "@/utils/paths";
function AppRouterInner() {
    const { coachTeamId, bootstrapping } = useGameState();
    const location = useLocation();
    const showNav = typeof coachTeamId === "number" &&
        !isNaN(coachTeamId) &&
        coachTeamId > 0 &&
        !location.pathname.startsWith("/matchday"); // Avoid showing TopNavBar on Matchday
    if (bootstrapping) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-800 text-white", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    return (_jsxs(_Fragment, { children: [showNav && _jsx(TopNavBar, { coachTeamId: coachTeamId }), _jsx("div", { className: "pt-12", children: _jsx(React.Suspense, { fallback: _jsx(ProgressBar, { className: "w-64 mx-auto mt-12" }), children: _jsxs(Routes, { children: [_jsx(Route, { path: titlePageUrl, element: _jsx(TitlePage, {}) }), _jsx(Route, { path: newGameUrl, element: _jsx(CountrySelectionPage, {}) }), _jsx(Route, { path: drawPageUrl, element: _jsx(DrawPage, {}) }), _jsx(Route, { path: loadGameUrl, element: _jsx(LoadGamePage, {}) }), _jsx(Route, { path: teamUrl(":teamId"), element: _jsx(TeamRosterPage, {}) }), _jsx(Route, { path: matchdayUrl, element: _jsx(MatchdayLivePage, {}) }), _jsx(Route, { path: standingsUrl, element: _jsx(StandingsPage, {}) }), _jsx(Route, { path: topPlayersUrl, element: _jsx(TopPlayersPage, {}) }), _jsx(Route, { path: transferMarketUrl, element: _jsx(TransferMarketPage, {}) }), _jsx(Route, { path: cupUrl, element: _jsx(CupLogPage, {}) }), _jsx(Route, { path: resultsUrl(":matchdayId"), element: _jsx(PostMatchSummary, {}) }), _jsx(Route, { path: "/results", element: _jsx(Navigate, { to: standingsUrl, replace: true }) }), _jsx(Route, { path: adminMatchesUrl, element: _jsx(MatchesPage, {}) }), _jsx(Route, { path: adminPlayersUrl, element: _jsx(PlayersPage, {}) }), _jsx(Route, { path: adminTeamsUrl, element: _jsx(TeamsPage, {}) }), _jsx(Route, { path: adminStatsUrl, element: _jsx(StatsPage, {}) }), _jsx(Route, { path: settingsUrl, element: _jsx(SettingsPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: titlePageUrl, replace: true }) })] }) }) })] }));
}
export default function AppRouter() {
    return (_jsx(BrowserRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true }, children: _jsx(AppRouterInner, {}) }));
}
//# sourceMappingURL=AppRouter.js.map