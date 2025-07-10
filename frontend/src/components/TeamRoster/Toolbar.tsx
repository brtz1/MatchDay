import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamContext } from '../../context/TeamContext';

export default function TeamRosterToolbar() {
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { selectedPlayer, setSellMode } = useTeamContext();

  const toggle = (menu: string) => {
    setOpen(open === menu ? null : menu);
  };

  const handleManualSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://localhost:4000/api/manual-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Manual Save', coachName: 'Coach' }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Game saved as "${data.saveName}"`);
      } else {
        alert(`❌ Save failed: ${data.error}`);
      }
    } finally {
      setSaving(false);
      setOpen(null);
    }
  };

  return (
    <nav className="bg-accent text-primary p-2 rounded shadow flex gap-4 text-xs relative">
      {/* Matchday */}
      <div className="relative">
        <button onClick={() => toggle('matchday')} className="hover:underline">Matchday</button>
        {open === 'matchday' && (
          <ul className="absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10">
            <li
              className="hover:bg-gray-100 px-2 py-1 cursor-pointer"
              onClick={handleManualSave}
            >
              {saving ? 'Saving...' : 'Save Game'}
            </li>
            <li
              className="hover:bg-gray-100 px-2 py-1 cursor-pointer"
              onClick={() => {
                setOpen(null);
                navigate('/load-game');
              }}
            >
              Load Game
            </li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Exit without saving</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Exit (Save)</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">About</li>
          </ul>
        )}
      </div>

      {/* Team */}
      <div className="relative">
        <button onClick={() => toggle('team')} className="hover:underline">Team</button>
        {open === 'team' && (
          <ul className="absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10">
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Loan</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Stadium</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">History</li>
          </ul>
        )}
      </div>

      {/* Player */}
      <div className="relative">
        <button onClick={() => toggle('player')} className="hover:underline">Player</button>
        {open === 'player' && (
          <ul className="absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10">
            <li
              className="hover:bg-gray-100 px-2 py-1 cursor-pointer"
              onClick={() => {
                if (selectedPlayer) {
                  setOpen(null);
                  setSellMode(true);
                  window.dispatchEvent(new CustomEvent("show-sell-tab"));
                } else {
                  alert("Select a player first!");
                }
              }}
            >
              Sell
            </li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Scout</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Search</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Last Transfers</li>
          </ul>
        )}
      </div>

      {/* League */}
      <div className="relative">
        <button onClick={() => toggle('league')} className="hover:underline">League</button>
        {open === 'league' && (
          <ul className="absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10">
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Standings</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Golden Boot</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Fixtures</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Last Winners</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Golden Boot History</li>
          </ul>
        )}
      </div>

      {/* Coach */}
      <div className="relative">
        <button onClick={() => toggle('coach')} className="hover:underline">Coach</button>
        {open === 'coach' && (
          <ul className="absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10">
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Contract</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Morale</li>
            <li className="hover:bg-gray-100 px-2 py-1 cursor-pointer">Resign</li>
          </ul>
        )}
      </div>
    </nav>
  );
}
