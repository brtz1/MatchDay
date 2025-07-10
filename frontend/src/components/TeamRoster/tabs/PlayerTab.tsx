import { SaveGamePlayer } from '@prisma/client';

interface PlayerTabProps {
  players: SaveGamePlayer[];
  selectedPlayer: SaveGamePlayer | null;
  onSelectPlayer: (player: SaveGamePlayer) => void;
}

export default function PlayerTab({ players, selectedPlayer, onSelectPlayer }: PlayerTabProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          onClick={() => onSelectPlayer(player)}
          className={`p-2 rounded border cursor-pointer ${
            selectedPlayer?.id === player.id ? 'bg-primary text-white' : 'hover:bg-gray-100'
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
