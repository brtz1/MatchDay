import React from 'react';
import { useNavigate } from 'react-router-dom';

const MainMenu: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-green-800 text-white">
      <h1 className="text-4xl font-bold">MatchDay!</h1>
      <div className="flex flex-col gap-4 mt-6">
        <button
          className="bg-white text-green-800 font-semibold px-6 py-2 rounded-xl shadow"
          onClick={() => navigate('/new-game')}
        >
          Start New Game
        </button>
        <button
          className="bg-white text-green-800 font-semibold px-6 py-2 rounded-xl shadow"
          onClick={() => navigate('/load-game')}
        >
          Load Game
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
