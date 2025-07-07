import { Routes, Route } from 'react-router-dom';
import TeamRoster from './pages/TeamRoster';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TeamRoster />} />
    </Routes>
  );
}
