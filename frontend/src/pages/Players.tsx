import { useEffect, useState } from 'react';
import { getPlayers, createPlayer } from '../services/players';
import { getTeams } from '../services/teamService';

interface Player {
  id: number;
  name: string;
  age: number;
  position: string;
  rating: number;
  value: number;
  salary: number;
  team?: { name: string };
}

interface Team {
  id: number;
  name: string;
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({
    name: '',
    age: 0,
    position: '',
    rating: 0,
    value: 0,
    salary: 0,
    teamId: undefined as number | undefined
  });

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const fetchPlayers = async () => {
    const data = await getPlayers();
    setPlayers(data);
  };

  const fetchTeams = async () => {
    const data = await getTeams();
    setTeams(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPlayer(form);
    await fetchPlayers();
    setForm({
      name: '',
      age: 0,
      position: '',
      rating: 0,
      value: 0,
      salary: 0,
      teamId: undefined
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-extrabold text-accent mb-4">Players Management</h1>

      <h2 className="text-xl font-bold text-accent mb-2">Existing Players</h2>
      <table className="border-collapse w-full mt-4 shadow rounded bg-white">
        <thead className="bg-accent text-primary">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Age</th>
            <th className="p-2">Position</th>
            <th className="p-2">Rating</th>
            <th className="p-2">Value</th>
            <th className="p-2">Salary</th>
            <th className="p-2">Team</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id} className="hover:bg-gray-100">
              <td className="p-2">{player.name}</td>
              <td className="p-2">{player.age}</td>
              <td className="p-2">{player.position}</td>
              <td className="p-2">{player.rating}</td>
              <td className="p-2">{player.value.toLocaleString()}</td>
              <td className="p-2">{player.salary.toLocaleString()}</td>
              <td className="p-2">{player.team?.name ?? 'Free Agent'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-bold text-accent mt-6 mb-2">Add New Player</h2>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4 bg-white p-4 rounded shadow w-full max-w-md">
        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="Player Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Age</label>
          <input
            className="border p-2 w-full rounded"
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={e => setForm({ ...form, age: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Position</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="Position"
            value={form.position}
            onChange={e => setForm({ ...form, position: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Rating</label>
          <input
            className="border p-2 w-full rounded"
            type="number"
            placeholder="Rating"
            value={form.rating}
            onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Value</label>
          <input
            className="border p-2 w-full rounded"
            type="number"
            placeholder="Value"
            value={form.value}
            onChange={e => setForm({ ...form, value: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Salary</label>
          <input
            className="border p-2 w-full rounded"
            type="number"
            placeholder="Salary"
            value={form.salary}
            onChange={e => setForm({ ...form, salary: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Assign to Team</label>
          <select
            className="border p-2 w-full rounded"
            value={form.teamId ?? ''}
            onChange={e => setForm({ ...form, teamId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Free Agent</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400"
        >
          Add Player
        </button>
      </form>
    </div>
  );
}
