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

export default function RenewTab({ player }: Props) {
  const { setRenewMode } = useTeamContext();

  return (
    <div>
      <p className="font-bold text-accent mb-2">Renew Contract</p>
      <p>{player.name} ({player.position}) - {player.rating} power</p>
      <input
        type="number"
        placeholder="New wage offer"
        className="border rounded p-1 w-full mb-2"
      />
      <button
        className="bg-green-600 text-white rounded px-2 py-1"
        onClick={() => {
          alert(`New contract proposed to ${player.name}`);
          setRenewMode(false);
        }}
      >
        Propose
      </button>
      <button
        className="bg-gray-300 rounded px-2 py-1 ml-2"
        onClick={() => setRenewMode(false)}
      >
        Back
      </button>
    </div>
  );
}
