import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SaveGame {
  id: number;
  name: string;
  coachName: string;
  createdAt: string;
  teams: { name: string; division: string }[];
}

export default function SaveGameList() {
  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:4000/api/save-game?includeTeams=true')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch saves');
        return res.json();
      })
      .then(data => {
        setSaves(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load save games');
        setLoading(false);
      });
  }, []);

  const loadSave = async (id: number, saveName: string) => {
    const confirmed = window.confirm(`Load save "${saveName}"? Unsaved progress will be lost.`);
    if (!confirmed) return;

    setLoadingId(id);
    try {
      const res = await fetch('http://localhost:4000/api/save-game/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Failed to load game');

      const data = await res.json();
      if (!data.coachTeamId) throw new Error('Missing coach team ID from response');

      navigate(`/save-game-teams/${data.coachTeamId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to load selected save game');
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-green-900 text-white flex flex-col items-center py-12 px-4">
      <h1 className="text-4xl font-bold mb-6">Load Save Game</h1>

      {loading && <p>Loading save games...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="w-full max-w-xl space-y-4">
          {saves.map((save) => {
            const coachTeam = save.teams?.find(t => t.division === 'D4');
            return (
              <div
                key={save.id}
                className="bg-white bg-opacity-10 rounded p-4 flex justify-between items-center shadow"
              >
                <div>
                  <p className="text-xl font-semibold">{save.name}</p>
                  <p className="text-sm text-gray-300">
                    Coach: {save.coachName || 'Unknown'} — Team: {coachTeam?.name || 'D4 team'}<br />
                    Created: {new Date(save.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => loadSave(save.id, save.name)}
                  disabled={loadingId === save.id}
                  className={`px-4 py-2 rounded bg-blue-500 hover:bg-blue-700 text-white font-semibold ${
                    loadingId === save.id ? 'opacity-50 cursor-wait' : ''
                  }`}
                >
                  {loadingId === save.id ? 'Loading...' : 'Resume'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 space-x-4">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white font-semibold"
        >
          Back to Menu
        </button>
        <button
          onClick={() => navigate('/new-game')}
          className="bg-yellow-500 hover:bg-yellow-600 px-6 py-2 rounded text-black font-semibold"
        >
          Start New Game
        </button>
      </div>
    </div>
  );
}
