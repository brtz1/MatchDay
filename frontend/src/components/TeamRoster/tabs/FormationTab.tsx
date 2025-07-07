import { useState } from 'react';

export default function FormationTab() {
  const [formation, setFormation] = useState<string | null>(null);

  const formations = ["3-3-4", "3-4-3", "4-2-4", "4-3-3", "4-4-2", "4-5-1", "5-2-3", "5-3-2", "5-4-1", "5-5-0", "6-3-1", "6-4-0"];

  const handleSetFormation = (value: string) => {
    setFormation(value);
  };

  return (
    <div>
      <p className="font-bold text-accent mb-2">Select Formation</p>
      <select
        className="border p-1 rounded w-full mb-2 text-black"
        onChange={(e) => handleSetFormation(e.target.value)}
        value={formation ?? ""}
      >
        <option value="">-- Select --</option>
        {formations.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <button
        className={`rounded px-2 py-1 mt-2 ${
          formation
            ? "bg-primary text-black hover:bg-yellow-400"
            : "bg-gray-300 cursor-not-allowed"
        }`}
        disabled={!formation}
        onClick={() => alert(`Proceeding to match with ${formation}!`)}
      >
        Matchday
      </button>
    </div>
  );
}
