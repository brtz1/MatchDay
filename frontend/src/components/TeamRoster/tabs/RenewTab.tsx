import { useState } from "react";
import { useTeamContext } from "../../../context/TeamContext";

export default function RenewTab() {
  const { selectedPlayer, setRenewMode } = useTeamContext();
  const [wageOffer, setWageOffer] = useState("");

  if (!selectedPlayer) return null;

  const handleRenew = () => {
    if (!wageOffer || isNaN(Number(wageOffer))) {
      alert("Please enter a valid wage.");
      return;
    }
    alert(`Proposed €${Number(wageOffer).toLocaleString()} to ${selectedPlayer.name}`);
    setRenewMode(false);
  };

  return (
    <div className="space-y-2">
      <h2 className="text-blue-700 font-semibold">Renew Contract</h2>
      <p className="text-sm">Player: <strong>{selectedPlayer.name}</strong></p>
      <input
        type="number"
        className="border p-1 rounded text-sm w-full"
        placeholder="Wage offer (€)"
        value={wageOffer}
        onChange={(e) => setWageOffer(e.target.value)}
      />
      <div className="flex space-x-2 mt-2">
        <button
          onClick={handleRenew}
          className="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800"
        >
          Propose
        </button>
        <button
          onClick={() => setRenewMode(false)}
          className="bg-gray-300 text-black px-3 py-1 rounded text-sm hover:bg-gray-400"
        >
          Back
        </button>
      </div>
    </div>
  );
}
