// File: frontend/src/components/DrawResults.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTeamContext } from "@/store/TeamContext";

interface DrawState {
  saveGameId: number;
  userTeamId: number;
  userTeamName: string;
  divisionPreview: string[];
}

export default function DrawResults() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setCurrentTeamId } = useTeamContext();
  const { userTeamName, userTeamId, divisionPreview } = state as DrawState;

  // Set context as soon as this page mounts
  useEffect(() => {
    if (userTeamId) {
      setCurrentTeamId(userTeamId);
    }
  }, [userTeamId, setCurrentTeamId]);

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Draw Results</h1>
      <p className="mb-4">
        <strong>Your team:</strong> {userTeamName} (ID: {userTeamId})
      </p>
      <div className="space-y-4">
        {divisionPreview.map(line => {
          const [div, ids] = line.split(':');
          const list = ids.split(',').map(id => id.trim());
          return (
            <div key={div}>
              <h2 className="text-xl">{div}</h2>
              <ul className="list-disc list-inside">
                {list.map(id => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => navigate(`/team/${userTeamId}`)}
        className="mt-6 px-4 py-2 bg-green-600 text-white rounded"
      >
        Go to Team Roster
      </button>
    </div>
  );
}
