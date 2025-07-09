import { useEffect, useState } from 'react';
import axios from 'axios';

export default function TopPlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/stats').then((res) => setPlayers(res.data));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Player Stats</h1>
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-2">Name</th>
            <th>Pos</th>
            <th>Nat</th>
            <th>G</th>
            <th>A</th>
            <th>Y</th>
            <th>R</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="text-center border-t">
              <td className="text-left px-2">{p.name}</td>
              <td>{p.position}</td>
              <td>{p.nationality}</td>
              <td>{p.goals}</td>
              <td>{p.assists}</td>
              <td>{p.yellow}</td>
              <td>{p.red}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
