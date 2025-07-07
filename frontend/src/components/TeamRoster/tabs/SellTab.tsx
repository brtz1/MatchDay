import { useTeamContext } from "../../../context/TeamContext";

interface Props {
  player: {
    id: number;
    name: string;
    position: string;
    rating: number;
    salary: number;
    nationality: string;
  };
}

export default function SellTab({ player }: Props) {
  const { setSellMode } = useTeamContext();

  return (
    <div>
      <p className="font-bold text-accent mb-2">Sell Player</p>
      <p>{player.name} ({player.position}) - {player.rating} power</p>
      <input
        type="number"
        placeholder="Minimum Price"
        className="border rounded p-1 w-full mb-2"
      />
      <button
        className="bg-red-600 text-white rounded px-2 py-1"
        onClick={() => {
          alert(`Player ${player.name} placed for sale!`);
          setSellMode(false);
        }}
      >
        Sell
      </button>
      <button
        className="bg-gray-300 rounded px-2 py-1 ml-2"
        onClick={() => setSellMode(false)}
      >
        Back
      </button>
    </div>
  );
}
