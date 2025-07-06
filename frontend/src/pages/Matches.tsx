import { useEffect, useState } from 'react';
import { getMatches, simulateMatch } from '../services/matches';
import { getTeams } from '../services/teams';
import { getReferees } from '../services/referees';

interface Match {
  id: number;
  homeScore: number;
  awayScore: number;
  matchDate: string;
  season: number;
  homeTeamId: number;
  awayTeamId: number;
}

interface Team {
  id: number;
  name: string;
}

interface Referee {
  id: number;
  name: string;
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [form, setForm] = useState({
    homeTeamId: 0,
    awayTeamId: 0,
    refereeId: 0,
  });

  useEffect(() => {
    fetchMatches();
    fetchTeams();
    fetchReferees();
  }, []);

  const fetchMatches = async () => {
    const data = await getMatches();
    setMatches(data);
  };

  const fetchTeams = async () => {
    const data = await getTeams();
    setTeams(data);
  };

  const fetchReferees = async () => {
    const data = await getReferees();
    setReferees(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await simulateMatch(form);
    await fetchMatches();
    setForm({
      homeTeamId: 0,
      awayTeamId: 0,
      refereeId: 0,
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-extrabold text-accent mb-4">Match Simulation</h1>

      <h2 className="text-xl font-bold text-accent mb-2">Played Matches</h2>
      <table className="border-collapse w-full mt-4 shadow rounded bg-white">
        <thead className="bg-accent text-primary">
          <tr>
            <th className="p-2">Home</th>
            <th className="p-2">Score</th>
            <th className="p-2">Away</th>
            <th className="p-2">Score</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(match => {
            const home = teams.find(t => t.id === match.homeTeamId)?.name ?? 'Unknown';
            const away = teams.find(t => t.id === match.awayTeamId)?.name ?? 'Unknown';
            return (
              <tr key={match.id} className="hover:bg-gray-100">
                <td className="p-2">{home}</td>
                <td className="p-2">{match.homeScore}</td>
                <td className="p-2">{away}</td>
                <td className="p-2">{match.awayScore}</td>
                <td className="p-2">{new Date(match.matchDate).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="text-xl font-bold text-accent mt-6 mb-2">Simulate New Match</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow w-full max-w-md">
        <div>
          <label className="block font-semibold mb-1">Home Team</label>
          <select
            className="border p-2 w-full rounded"
            value={form.homeTeamId}
            onChange={e => setForm({ ...form, homeTeamId: Number(e.target.value) })}
            required
          >
            <option value="">Select Home Team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Away Team</label>
          <select
            className="border p-2 w-full rounded"
            value={form.awayTeamId}
            onChange={e => setForm({ ...form, awayTeamId: Number(e.target.value) })}
            required
          >
            <option value="">Select Away Team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Referee</label>
          <select
            className="border p-2 w-full rounded"
            value={form.refereeId}
            onChange={e => setForm({ ...form, refereeId: Number(e.target.value) })}
            required
          >
            <option value="">Select Referee</option>
            {referees.map(ref => (
              <option key={ref.id} value={ref.id}>{ref.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400"
        >
          Simulate Match
        </button>
      </form>
    </div>
  );
}
