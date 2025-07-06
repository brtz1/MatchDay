import { useEffect, useState } from 'react';
import { getPlayers } from '../services/players';
import { getPlayerStats, recordPlayerStats } from '../services/stats';
import { getMatches } from '../services/matches';

interface Player {
  id: number;
  name: string;
}

interface Match {
  id: number;
}

interface PlayerStat {
  id: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  matchId: number;
}

export default function Stats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [form, setForm] = useState({
    matchId: 0,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0
  });

  useEffect(() => {
    fetchPlayers();
    fetchMatches();
  }, []);

  const fetchPlayers = async () => {
    const data = await getPlayers();
    setPlayers(data);
  };

  const fetchMatches = async () => {
    const data = await getMatches();
    setMatches(data);
  };

  const handleSelectPlayer = async (playerId: number) => {
    setSelectedPlayer(playerId);
    const data = await getPlayerStats(playerId);
    setStats(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    await recordPlayerStats({
      playerId: selectedPlayer,
      matchId: form.matchId,
      goals: form.goals,
      assists: form.assists,
      yellow: form.yellow,
      red: form.red
    });
    await handleSelectPlayer(selectedPlayer);
    setForm({ matchId: 0, goals: 0, assists: 0, yellow: 0, red: 0 });
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-extrabold text-accent mb-4">Player Statistics</h1>

      <div>
        <label className="block font-semibold mb-2">Select Player</label>
        <select
          className="border p-2 w-full rounded"
          value={selectedPlayer ?? ''}
          onChange={e => handleSelectPlayer(Number(e.target.value))}
        >
          <option value="">Select Player</option>
          {players.map(player => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <>
          <h2 className="text-xl font-bold text-accent mt-6 mb-2">Match Stats</h2>
          <table className="border-collapse w-full mt-4 shadow rounded bg-white">
            <thead className="bg-accent text-primary">
              <tr>
                <th className="p-2">Match</th>
                <th className="p-2">Goals</th>
                <th className="p-2">Assists</th>
                <th className="p-2">Yellow</th>
                <th className="p-2">Red</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(stat => (
                <tr key={stat.id} className="hover:bg-gray-100">
                  <td className="p-2">#{stat.matchId}</td>
                  <td className="p-2">{stat.goals}</td>
                  <td className="p-2">{stat.assists}</td>
                  <td className="p-2">{stat.yellow}</td>
                  <td className="p-2">{stat.red}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-xl font-bold text-accent mt-6 mb-2">Record New Stats</h2>
          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow w-full max-w-md">
            <div>
              <label className="block font-semibold mb-1">Match</label>
              <select
                className="border p-2 w-full rounded"
                value={form.matchId}
                onChange={e => setForm({ ...form, matchId: Number(e.target.value) })}
                required
              >
                <option value="">Select Match</option>
                {matches.map(match => (
                  <option key={match.id} value={match.id}>#{match.id}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                className="border p-2 w-full rounded"
                type="number"
                placeholder="Goals"
                value={form.goals}
                onChange={e => setForm({ ...form, goals: Number(e.target.value) })}
              />
              <input
                className="border p-2 w-full rounded"
                type="number"
                placeholder="Assists"
                value={form.assists}
                onChange={e => setForm({ ...form, assists: Number(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <input
                className="border p-2 w-full rounded"
                type="number"
                placeholder="Yellow Cards"
                value={form.yellow}
                onChange={e => setForm({ ...form, yellow: Number(e.target.value) })}
              />
              <input
                className="border p-2 w-full rounded"
                type="number"
                placeholder="Red Cards"
                value={form.red}
                onChange={e => setForm({ ...form, red: Number(e.target.value) })}
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400"
            >
              Record Stats
            </button>
          </form>
        </>
      )}
    </div>
  );
}
