import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/routes/AppRouter.tsx
import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate, } from "react-router-dom";
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
/* ── Admin / utilities (lazy-loaded) */
const MatchesPage = React.lazy(() => import("@/pages/MatchesPage"));
const PlayersPage = React.lazy(() => import("@/pages/PlayersPage"));
const TeamsPage = React.lazy(() => import("@/pages/TeamsPage"));
const StatsPage = React.lazy(() => import("@/pages/StatsPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
/* ── Elifoot-style nav bar */
import TopNavBar from "@/components/common/TopNavBar";
import { ProgressBar } from "@/components/common/ProgressBar";
/* ── Route constants */
import { adminMatchesUrl, adminPlayersUrl, adminStatsUrl, adminTeamsUrl, drawPageUrl, loadGameUrl, matchdayUrl, newGameUrl, settingsUrl, standingsUrl, titlePageUrl, topPlayersUrl, transferMarketUrl, teamUrl, cupUrl, } from "@/utils/paths";
/**
 * Scroll to top on route change
 */
function ScrollToTop() {
    const { pathname } = window.location;
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}
/**
 * Router setup
 */
export default function AppRouter() {
    return (_jsxs(BrowserRouter, { children: [_jsx(ScrollToTop, {}), _jsx(TopNavBar, {}), _jsx("div", { className: "pt-12", children: _jsx(React.Suspense, { fallback: _jsx("div", { className: "p-6", children: _jsx(ProgressBar, { className: "w-64" }) }), children: _jsxs(Routes, { children: [_jsx(Route, { path: titlePageUrl, element: _jsx(TitlePage, {}) }), _jsx(Route, { path: newGameUrl, element: _jsx(CountrySelectionPage, {}) }), _jsx(Route, { path: drawPageUrl, element: _jsx(DrawPage, {}) }), _jsx(Route, { path: loadGameUrl, element: _jsx(LoadGamePage, {}) }), _jsx(Route, { path: teamUrl(":teamId"), element: _jsx(TeamRosterPage, {}) }), _jsx(Route, { path: matchdayUrl, element: _jsx(MatchdayLivePage, {}) }), _jsx(Route, { path: standingsUrl, element: _jsx(StandingsPage, {}) }), _jsx(Route, { path: topPlayersUrl, element: _jsx(TopPlayersPage, {}) }), _jsx(Route, { path: transferMarketUrl, element: _jsx(TransferMarketPage, {}) }), _jsx(Route, { path: cupUrl, element: _jsx(CupLogPage, {}) }), _jsx(Route, { path: adminMatchesUrl, element: _jsx(MatchesPage, {}) }), _jsx(Route, { path: adminPlayersUrl, element: _jsx(PlayersPage, {}) }), _jsx(Route, { path: adminTeamsUrl, element: _jsx(TeamsPage, {}) }), _jsx(Route, { path: adminStatsUrl, element: _jsx(StatsPage, {}) }), _jsx(Route, { path: settingsUrl, element: _jsx(SettingsPage, {}) }), _jsx(Route, { path: "/new-game", element: _jsx(Navigate, { to: newGameUrl, replace: true }) }), _jsx(Route, { path: "/load", element: _jsx(Navigate, { to: loadGameUrl, replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: titlePageUrl, replace: true }) })] }) }) })] }));
}
//# sourceMappingURL=AppRouter.js.map