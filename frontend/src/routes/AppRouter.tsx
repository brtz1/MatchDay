import * as React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

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

/* ── Admin / utilities (lazy-loaded) */
const MatchesPage = React.lazy(() => import("@/pages/MatchesPage"));
const PlayersPage = React.lazy(() => import("@/pages/PlayersPage"));
const TeamsPage   = React.lazy(() => import("@/pages/TeamsPage"));
const StatsPage   = React.lazy(() => import("@/pages/StatsPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));

/* ── Elifoot-style nav bar */
import TopNavBar from "@/components/common/TopNavBar";
import { ProgressBar } from "@/components/common/ProgressBar";

/* ── Route constants */
import {
  adminMatchesUrl,
  adminPlayersUrl,
  adminStatsUrl,
  adminTeamsUrl,
  drawPageUrl,
  loadGameUrl,
  matchdayUrl,
  newGameUrl,
  settingsUrl,
  standingsUrl,
  titlePageUrl,
  topPlayersUrl,
  transferMarketUrl,
  teamUrl,
} from "@/utils/paths";

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
  return (
    <BrowserRouter>
      <ScrollToTop />
      <TopNavBar />

      <div className="pt-12">
        <React.Suspense
          fallback={
            <div className="p-6">
              <ProgressBar className="w-64" />
            </div>
          }
        >
          <Routes>
            {/* Public flow */}
            <Route path={titlePageUrl} element={<TitlePage />} />
            <Route path={newGameUrl} element={<CountrySelectionPage />} />
            <Route path={drawPageUrl} element={<DrawPage />} />
            <Route path={loadGameUrl} element={<LoadGamePage />} />

            {/* Core gameplay */}
            <Route path={teamUrl(":teamId")} element={<TeamRosterPage />} />
            <Route path={matchdayUrl} element={<MatchdayLivePage />} />
            <Route path={standingsUrl} element={<StandingsPage />} />
            <Route path={topPlayersUrl} element={<TopPlayersPage />} />
            <Route path={transferMarketUrl} element={<TransferMarketPage />} />

            {/* Team context */}

            {/* Admin */}
            <Route path={adminMatchesUrl} element={<MatchesPage />} />
            <Route path={adminPlayersUrl} element={<PlayersPage />} />
            <Route path={adminTeamsUrl} element={<TeamsPage />} />
            <Route path={adminStatsUrl} element={<StatsPage />} />

            {/* Settings */}
            <Route path={settingsUrl} element={<SettingsPage />} />

            {/* Redirects */}
            <Route path="/new-game" element={<Navigate to={newGameUrl} replace />} />
            <Route path="/load" element={<Navigate to={loadGameUrl} replace />} />
            <Route path="*" element={<Navigate to={titlePageUrl} replace />} />
          </Routes>
        </React.Suspense>
      </div>
    </BrowserRouter>
  );
}
