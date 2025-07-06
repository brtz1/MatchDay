import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Matches from './pages/Matches';
import Stats from './pages/Stats';

function App() {
  return (
    <div className="min-h-screen bg-background text-black">
      <nav className="bg-accent text-primary p-4 flex gap-6 font-bold text-lg shadow">
        <Link to="/">Dashboard</Link>
        <Link to="/teams">Teams</Link>
        <Link to="/players">Players</Link>
        <Link to="/matches">Matches</Link>
        <Link to="/stats">Stats</Link>
      </nav>
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/players" element={<Players />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
