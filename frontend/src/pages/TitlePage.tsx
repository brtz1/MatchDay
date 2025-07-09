import { useNavigate } from 'react-router-dom';

export default function TitlePage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-green-800 text-white">
      <h1 className="text-6xl font-bold mb-10 tracking-wide">MatchDay! <span className="text-sm align-top">25</span></h1>

      <div className="flex flex-col space-y-4 w-64">
        <button
          onClick={() => navigate('/new-game')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded"
        >
          Start New Game
        </button>
        <button
          onClick={() => navigate('/load')}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded"
        >
          Load Game
        </button>
        <button
          onClick={() => alert('Settings coming soon')}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-6 rounded"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
