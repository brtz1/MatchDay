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
import {
  teamUrl,
  matchdayUrl,
  standingsUrl,
  topPlayersUrl,
  transferMarketUrl,
  cupUrl,
  newGameUrl,
  drawPageUrl,
  loadGameUrl,
  settingsUrl,
  titlePageUrl,
  adminMatchesUrl,
  adminPlayersUrl,
  adminTeamsUrl,
  adminStatsUrl,
  resultsUrl,
} from "@/utils/paths";

function AppRouterInner() {
  const { coachTeamId, bootstrapping } = useGameState();
  const location = useLocation();

  const showNav =
    typeof coachTeamId === "number" &&
    !isNaN(coachTeamId) &&
    coachTeamId > 0 &&
    !location.pathname.startsWith("/matchday"); // Avoid showing TopNavBar on Matchday

  if (bootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-800 text-white">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  return (
    <>
      {showNav && <TopNavBar coachTeamId={coachTeamId} />}
      <div className="pt-12">
        <React.Suspense fallback={<ProgressBar className="w-64 mx-auto mt-12" />}>
          <Routes>
            {/* Public */}
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
            <Route path={cupUrl} element={<CupLogPage />} />
            <Route path={resultsUrl(":matchdayId")} element={<PostMatchSummary />} />
            <Route path="/results" element={<Navigate to={standingsUrl} replace />} />

            {/* Admin / utilities */}
            <Route path={adminMatchesUrl} element={<MatchesPage />} />
            <Route path={adminPlayersUrl} element={<PlayersPage />} />
            <Route path={adminTeamsUrl} element={<TeamsPage />} />
            <Route path={adminStatsUrl} element={<StatsPage />} />

            {/* Settings */}
            <Route path={settingsUrl} element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to={titlePageUrl} replace />} />
          </Routes>
        </React.Suspense>
      </div>
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRouterInner />
    </BrowserRouter>
  );
}
