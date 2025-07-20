// frontend/src/components/cup/CupBracket.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface CupMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  matchdayNumber: number;
  stage: string;
}

interface CupBracketProps {
  matches: CupMatch[];
}

const stages = [
  'Round of 128',
  'Round of 64',
  'Round of 32',
  'Round of 16',
  'Quarterfinal',
  'Semifinal',
  'Final',
];

export default function CupBracket({ matches }: CupBracketProps) {
  const navigate = useNavigate();

  const getMatchesByStage = (stage: string) =>
    matches.filter((m) => m.stage === stage);

  return (
    <div className="flex space-x-8 overflow-x-auto p-2">
      {stages.map((stage) => (
        <div key={stage} className="flex flex-col min-w-[180px]">
          <h2 className="text-lg font-semibold mb-2 text-center">{stage}</h2>
          {getMatchesByStage(stage).map((match) => (
            <div
              key={match.id}
              className="bg-white border shadow-sm rounded-xl p-2 mb-2 hover:bg-yellow-100 cursor-pointer"
            >
              <div
                className="text-sm font-semibold"
                onClick={() => navigate(`/teams/${match.homeTeam}`)}
              >
                {match.homeTeam}
              </div>
              <div
                className="text-sm font-semibold"
                onClick={() => navigate(`/teams/${match.awayTeam}`)}
              >
                {match.awayTeam}
              </div>
              {match.homeGoals !== null && match.awayGoals !== null && (
                <div className="text-sm text-center mt-1">
                  {match.homeGoals} - {match.awayGoals}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
