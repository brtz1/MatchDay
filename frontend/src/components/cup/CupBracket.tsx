import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface CupMatch {
  id: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
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
    <div className="flex space-x-8 overflow-x-auto p-2 w-full justify-center">
      {stages.map((stage) => {
        const matchesForStage = getMatchesByStage(stage);
        return (
          <div
            key={stage}
            className="flex flex-col items-center min-w-[250px] max-w-[340px] bg-gradient-to-br from-blue-50 to-blue-200/70 rounded-2xl border border-blue-200 shadow-lg dark:border-blue-900 dark:from-blue-950 dark:to-blue-800/80 pb-4"
          >
            {/* Stage Header */}
            <div className="w-full flex items-center justify-center rounded-t-2xl bg-blue-100 px-4 py-3 shadow-inner dark:bg-blue-900/60 mb-2">
              <h2 className="text-xl font-bold tracking-wide text-blue-700 dark:text-yellow-300 uppercase text-center">
                {stage}
              </h2>
            </div>
            <div className="w-full rounded-xl bg-white/90 p-0 shadow-inner dark:bg-gray-950/60">
              {matchesForStage.length === 0 ? (
                <div className="text-gray-400 text-center py-4">No matches</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {matchesForStage.map((match, idx) => (
                      <tr
                        key={match.id}
                        className={
                          `transition-colors duration-100 cursor-pointer
                          ${idx % 2 === 0
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'bg-blue-100/60 dark:bg-blue-950/30'}
                          hover:bg-yellow-100 dark:hover:bg-yellow-900/30`
                        }
                        onClick={() => navigate(`/teams/${match.homeTeamId}`)}
                      >
                        <td className="py-2 px-2 w-[90px] text-[#0d223d] text-center font-semibold hover:text-yellow-700 truncate"
                          title={match.homeTeam}
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/teams/${match.homeTeamId}`);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {match.homeTeam}
                        </td>
                        <td className="py-2 px-2 w-[16px] font-bold text-yellow-700 text-center align-middle">
                          {match.homeGoals !== null && match.awayGoals !== null
                            ? `${match.homeGoals} - ${match.awayGoals}`
                            : "-"}
                        </td>
                        <td className="py-2 px-2 w-[90px] text-[#0d223d] text-center font-semibold hover:text-yellow-700 truncate"
                          title={match.awayTeam}
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/teams/${match.awayTeam}`);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {match.awayTeam}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
