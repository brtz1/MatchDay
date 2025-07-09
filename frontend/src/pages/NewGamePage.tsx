import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TitlePage() {
  const [canContinue, setCanContinue] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:4000/api/gamestate')
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data && data.coachTeamId) setCanContinue(true);
      })
      .catch(() => setCanContinue(false));
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-green-800 text-white">
      <h1 className="text-6xl font-bold mb-10 tracking-wide">MatchDay! <span className="text-sm align-top">25</span></h1>

      <div className="space-y-4">
        <button
          onClick={() => navigate('/new-game')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded"
        >
          Start New Game
        </button>
        <button
          onClick={() => navigate('/load')}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded"
        >
          Load Game
        </button>
        {canContinue && (
          <button
            onClick={() => navigate('/team')}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
