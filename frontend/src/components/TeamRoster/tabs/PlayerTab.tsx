import { useTeamContext } from "../../../context/TeamContext";
import { Player } from "../../../types";

export default function PlayerTab() {
  const { selectedPlayer, setRenewMode } = useTeamContext();

  if (!selectedPlayer) return <p>Select a player to view details.</p>;

  return (
    <div>
      <p className="font-bold text-accent mb-2">Player Details</p>
      <p>Name: {selectedPlayer.name}</p>
      <p>Country: {selectedPlayer.nationality ?? "🇵🇹"}</p>
      <p>Behaviour: Normal</p>
      <p>Games Played: 10</p>
      <p>Goals This Season: 5</p>
      <p>Total Goals: 15</p>
      <p>Red Cards: 1</p>
      <p>Injuries: 0</p>
      <button
        className="bg-primary text-black rounded px-2 py-1 mt-2"
        onClick={() => {
          setRenewMode(true);
          window.dispatchEvent(new CustomEvent("show-renew-tab"));
        }}
      >
        Renew Contract
      </button>
    </div>
  );
}
