// frontend/src/components/TeamRoster/tabs/PlayerTab.tsx

interface Player {
  id: number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
}

interface PlayerTabProps {
  players: Player[];
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
}

export default function PlayerTab({
  players,
  selectedPlayer,
  onSelectPlayer,
}: PlayerTabProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          onClick={() => onSelectPlayer(player)}
          className={`p-2 rounded border cursor-pointer ${
            selectedPlayer?.id === player.id
              ? "bg-primary text-white"
              : "hover:bg-gray-100"
          }`}
        >
          <div className="flex justify-between">
            <span>{player.name}</span>
            <span className="text-sm text-gray-500">
              {player.position} – {player.rating}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
