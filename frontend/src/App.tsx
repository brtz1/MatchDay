// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import TitlePage          from './pages/TitlePage';
import CountrySelector    from './pages/CountrySelector';
import DrawPage           from './pages/DrawPage';
import LoadGamePage       from './pages/LoadGamePage';
import TeamRoster         from './pages/TeamRoster';
import MatchdayLive       from './pages/MatchDayLive';
import StandingsPage      from './pages/StandingsPage';
import TopPlayersPage     from './pages/TopPlayersPage';
import PostMatchSummary   from './pages/PostMatchSummary';

export default function App() {
  return (
    <Routes>
      <Route path="/"                   element={<TitlePage />} />
      <Route path="/new-game"           element={<CountrySelector />} />
      <Route path="/draw"               element={<DrawPage />} />
      <Route path="/load"               element={<LoadGamePage />} />

      {/* Let the page itself read useParams() */}
      <Route path="/team/:teamId"       element={<TeamRoster />} />

      <Route path="/matchday"           element={<MatchdayLive />} />
      <Route path="/standings"          element={<StandingsPage />} />
      <Route path="/top-players"        element={<TopPlayersPage />} />
      <Route path="/summary/:matchdayId" element={<PostMatchSummary matchdayId={0} />} />

      {/* fallback */}
      <Route path="*"                   element={<Navigate to="/" replace />} />
    </Routes>
  );
}
