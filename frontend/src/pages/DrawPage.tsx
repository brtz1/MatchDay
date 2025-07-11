import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTeamContext } from '../context/TeamContext';

export default function DrawPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentTeamId, setSaveGameId } = useTeamContext();

  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachName, setCoachName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [userTeamId, setUserTeamId] = useState<number | null>(null);
  const [divisionPreview, setDivisionPreview] = useState<string[]>([]);

  useEffect(() => {
    const fromState = location.state?.selectedCountries;
    const fromStorage = localStorage.getItem('selectedCountries');

    if (fromState?.length) {
      setSelectedCountries(fromState);
      localStorage.setItem('selectedCountries', JSON.stringify(fromState));
    } else if (fromStorage) {
      try {
        const parsed = JSON.parse(fromStorage);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedCountries(parsed);
        } else {
          navigate('/');
        }
      } catch {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (userTeamId !== null && teamName !== '') {
      setCurrentTeamId(userTeamId);
      navigate(`/save-game-teams/${userTeamId}`, { replace: true });
    }
  }, [userTeamId, teamName, navigate, setCurrentTeamId]);

  const startGame = async () => {
    if (!coachName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/api/save-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Save',
          coachName,
          countries: selectedCountries,
        }),
      });

      const data = await res.json();
      console.log('🎯 Draw response:', data);

      if (!res.ok || !data.userTeamId || !data.userTeamName || !data.saveGameId) {
        throw new Error(data.error || 'Invalid draw response from server');
      }

      const teamId = Number(data.userTeamId);
      if (isNaN(teamId)) throw new Error('Invalid userTeamId from backend');

      setSaveGameId(data.saveGameId);
      setUserTeamId(teamId);
      setTeamName(data.userTeamName);
      setDivisionPreview(data.divisionPreview || []);
      localStorage.removeItem('selectedCountries');
      setLoading(false);
    } catch (err: any) {
      console.error("❌ Error during team draw:", err);
      setError(err.message || 'Something went wrong during draw');
      setLoading(false);
    }
  };

  if (!selectedCountries) {
    return (
      <div className="h-screen flex items-center justify-center bg-green-800 text-white text-xl">
        Loading selected countries...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-green-800 text-white text-center px-4">
      <h1 className="text-5xl font-bold mb-6">Draw Your Team</h1>

      {loading ? (
        <p className="text-xl">Drawing your team...</p>
      ) : error ? (
        <div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white font-semibold"
          >
            Back to Menu
          </button>
        </div>
      ) : teamName ? (
        <div>
          <p className="text-3xl mb-4">You have been assigned to:</p>
          <p className="text-5xl font-bold text-yellow-400 mb-6">{teamName}</p>

          <div className="bg-white bg-opacity-10 rounded p-4 my-4 text-left max-w-xl mx-auto">
            <h2 className="text-xl font-semibold mb-2">Division Preview</h2>
            <ul className="text-sm text-gray-200">
              {divisionPreview.map((entry, idx) => (
                <li key={idx} className="py-1 border-b border-gray-500">{entry}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => {
              if (userTeamId !== null) {
                console.log("🟡 Manual navigate to", userTeamId);
                navigate(`/save-game-teams/${userTeamId}`);
              }
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded"
          >
            Let&apos;s Go!
          </button>
        </div>
      ) : (
        <div className="max-w-md w-full space-y-6">
          <input
            type="text"
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            placeholder="Enter your coach name"
            className="w-full p-3 rounded text-black text-lg"
          />
          <button
            onClick={startGame}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded"
          >
            Draw Team
          </button>
        </div>
      )}
    </div>
  );
}
