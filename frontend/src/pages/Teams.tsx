import { useEffect, useState } from 'react';
import { getTeams, createTeam } from '../services/teamService';

interface Team {
  id: number;
  name: string;
  country: string;
  budget: number;
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({ name: '', country: '', budget: 0 });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const data = await getTeams();
    setTeams(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTeam(form);
    await fetchTeams();
    setForm({ name: '', country: '', budget: 0 });
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-extrabold text-accent mb-4">Teams Management</h1>

      <h2 className="text-xl font-bold text-accent mb-2">Existing Teams</h2>
      <table className="border-collapse w-full mt-4 shadow rounded bg-white">
        <thead className="bg-accent text-primary">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Country</th>
            <th className="p-2">Budget</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr key={team.id} className="hover:bg-gray-100">
              <td className="p-2">{team.name}</td>
              <td className="p-2">{team.country}</td>
              <td className="p-2">{team.budget.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-bold text-accent mt-6 mb-2">Add New Team</h2>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4 bg-white p-4 rounded shadow w-full max-w-md">
        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="Team Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Country</label>
          <input
            className="border p-2 w-full rounded"
            placeholder="Country"
            value={form.country}
            onChange={e => setForm({ ...form, country: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Budget</label>
          <input
            className="border p-2 w-full rounded"
            type="number"
            placeholder="Budget"
            value={form.budget}
            onChange={e => setForm({ ...form, budget: Number(e.target.value) })}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400"
        >
          Add Team
        </button>
      </form>
    </div>
  );
}
