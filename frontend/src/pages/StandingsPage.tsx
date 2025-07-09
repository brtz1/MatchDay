import { useEffect, useState } from 'react';
import axios from 'axios';

export default function StandingsPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/standings').then((res) => setData(res.data));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">League Standings</h1>
      {data.map((div) => (
        <div key={div.division} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{div.division}</h2>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-2">Team</th>
                <th>Pts</th>
                <th>Pl</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
              </tr>
            </thead>
            <tbody>
              {div.teams.map((team, idx) => (
                <tr key={idx} className="text-center border-t">
                  <td className="text-left px-2">{team.name}</td>
                  <td>{team.points}</td>
                  <td>{team.played}</td>
                  <td>{team.wins}</td>
                  <td>{team.draws}</td>
                  <td>{team.losses}</td>
                  <td>{team.goalsFor}</td>
                  <td>{team.goalsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
