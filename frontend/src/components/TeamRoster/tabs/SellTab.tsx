import { useState } from "react";
import { useTeamContext } from "@/store/TeamContext";

// Minimal player type (only what we use)
interface Player {
  id: number;
  name: string;
}

export default function SellTab() {
  const { selectedPlayer, setSellMode } = useTeamContext();
  const [minPrice, setMinPrice] = useState("");

  if (!selectedPlayer) return null;

  const handleSell = () => {
    const price = Number(minPrice);
    if (!minPrice || isNaN(price)) {
      alert("Please enter a valid minimum price.");
      return;
    }

    alert(`Player ${selectedPlayer.name} is now for sale at €${price.toLocaleString()}`);
    setSellMode(false);
  };

  return (
    <div className="space-y-2">
      <h2 className="text-blue-700 font-semibold">Sell Player</h2>
      <p className="text-sm">
        Player: <strong>{selectedPlayer.name}</strong>
      </p>
      <input
        type="number"
        className="border p-1 rounded text-sm w-full"
        placeholder="Minimum price (€)"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
      />
      <div className="flex space-x-2 mt-2">
        <button
          onClick={handleSell}
          className="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800"
        >
          Confirm
        </button>
        <button
          onClick={() => setSellMode(false)}
          className="bg-gray-300 text-black px-3 py-1 rounded text-sm hover:bg-gray-400"
        >
          Back
        </button>
      </div>
    </div>
  );
}
