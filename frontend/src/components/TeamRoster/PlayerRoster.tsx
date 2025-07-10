import { getFlagUrl } from "../../utils/getFlagUrl";
import { SaveGamePlayer } from '@prisma/client';

interface PlayerRosterProps {
  players: SaveGamePlayer[];
  selectedPlayer: SaveGamePlayer | null;
  onSelectPlayer: (player: SaveGamePlayer) => void;
}

export default function PlayerRoster({ players, selectedPlayer, onSelectPlayer }: PlayerRosterProps) {
  const positions: ("GK" | "DF" | "MF" | "AT")[] = ["GK", "DF", "MF", "AT"];

  return (
    <div className="bg-white rounded-lg shadow p-3 text-black text-xs w-full h-full flex flex-col justify-between">
      {/* header row */}
      <div className="flex font-semibold border-b border-gray-300 pb-2 mb-2">
        <span className="w-[45%]">Name</span>
        <span className="w-[15%] text-right">Salary</span>
        <span className="w-[10%] text-right">Rat</span>
        <span className="w-[10%] text-right">🌐</span>
        <span className="w-[10%] text-right">C</span>
      </div>

      <div className="flex flex-col justify-start gap-2 overflow-hidden">
        {positions.map((pos) => (
          <div key={pos}>
            <div className="text-blue-700 text-xs font-bold uppercase tracking-wide mb-1">
              {pos}
            </div>
            <div className="rounded border border-gray-200 overflow-hidden bg-white">
              {players
                .filter((p) => p.position === pos)
                .concat(
                  Array.from({ length: 5 - players.filter((p) => p.position === pos).length }, (_, i) => ({
                    id: 1000 + i,
                    name: "",
                    position: pos,
                    rating: 0,
                    salary: 0,
                    nationality: "",
                    underContract: false,
                  }))
                )
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center px-2 py-[3px] cursor-pointer ${
                      selectedPlayer?.id === p.id
                        ? "bg-yellow-200"
                        : idx % 2 === 0
                        ? "bg-gray-50"
                        : "bg-white"
                    } hover:bg-gray-100 border-b border-white last:border-b-0`}
                    onClick={() => p.name && onSelectPlayer(p)}
                    style={{ minHeight: "24px" }}
                  >
                    {p.name ? (
                      <>
                        <span className="w-[45%] truncate">{p.name}</span>
                        <span className="w-[15%] text-right">€{p.salary.toLocaleString()}</span>
                        <span className="w-[10%] text-right">{p.rating}</span>
                        <span className="w-[10%] text-right">
                          {p.nationality && (
                            <img
                              src={getFlagUrl(p.nationality)}
                              alt={p.nationality}
                              className="inline w-5 h-4"
                            />
                          )}
                        </span>
                        <span className="w-[10%] text-right">
                          {p.underContract ? "🔒" : "🆓"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-[45%]">&nbsp;</span>
                        <span className="w-[15%] text-right">&nbsp;</span>
                        <span className="w-[10%] text-right">&nbsp;</span>
                        <span className="w-[10%] text-right">&nbsp;</span>
                        <span className="w-[10%] text-right">&nbsp;</span>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
