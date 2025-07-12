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

/* ── Admin / utilities (lazy-loaded) */
const MatchesPage = React.lazy(() => import("@/pages/MatchesPage"));
const PlayersPage = React.lazy(() => import("@/pages/PlayersPage"));
const TeamsPage   = React.lazy(() => import("@/pages/TeamsPage"));
const StatsPage   = React.lazy(() => import("@/pages/StatsPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));

/* ── Layout chrome components */
import AppHeader from "@/components/Layout/AppHeader";
import SideNav   from "@/components/Layout/SideNav";
import { ProgressBar } from "@/components/common/ProgressBar";

/**
 * ---------------------------------------------------------------------------
 * ScrollToTop – optional helper to reset viewport on route change
 * ---------------------------------------------------------------------------
 */
function ScrollToTop() {
  const { pathname } = window.location;
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * ---------------------------------------------------------------------------
 * Router
 * ---------------------------------------------------------------------------
 */
export default function AppRouter() {
  /* mobile side-nav drawer */
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <BrowserRouter>
      <ScrollToTop />

      {/* App chrome */}
      <AppHeader
        showMenuButton
        onMenuToggle={() => setDrawerOpen(true)}
      />
      <SideNav
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Route outlet */}
      <React.Suspense
        fallback={
          <div className="p-6">
            <ProgressBar className="w-64" />
          </div>
        }
      >
        <Routes>
          {/* Public flow */}
          <Route path="/" element={<TitlePage />} />
          <Route
            path="/country-selection"
            element={<CountrySelectionPage />}
          />
          <Route path="/draw" element={<DrawPage />} />
          <Route path="/load-game" element={<LoadGamePage />} />

          {/* Core gameplay */}
          <Route path="/team/:teamId" element={<TeamRosterPage />} />
          <Route path="/matchday" element={<MatchdayLivePage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route
            path="/stats/top-players"
            element={<TopPlayersPage />}
          />

          {/* Admin / maintenance */}
          <Route path="/admin/matches" element={<MatchesPage />} />
          <Route path="/admin/players" element={<PlayersPage />} />
          <Route path="/admin/teams" element={<TeamsPage />} />
          <Route path="/admin/player-stats" element={<StatsPage />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* Legacy redirects */}
          <Route
            path="/new-game"
            element={<Navigate to="/country-selection" replace />}
          />
          <Route
            path="/load"
            element={<Navigate to="/load-game" replace />}
          />

          {/* 404 → title page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
