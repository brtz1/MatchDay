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
  return (
    <Routes>
      <Route path="/" element={<TitlePage />} />
      <Route path="*" element={<Navigate to="/" />} />
      <Route path="/new-game" element={<CountrySelector />} />
      <Route path="/team" element={<TeamRoster />} />
      <Route path="/load" element={<LoadGamePage />} />
      <Route path="/matchday" element={<MatchdayLive />} />
      <Route path="/standings" element={<StandingsPage />} />
      <Route path="/top-players" element={<TopPlayersPage />} />
      <Route path="/summary/:matchdayId" element={<PostMatchSummaryWrapper />} />
      <Route path="/draw" element={<DrawPage />} />
      <Route path="/teams/:id" element={<TeamRoster />} />
    </Routes>
  );
}

function PostMatchSummaryWrapper() {
  const { matchdayId } = useParams();
  return <PostMatchSummary matchdayId={parseInt(matchdayId || '0')} />;
}
