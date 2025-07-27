import { useState } from "react";
import { useGameState } from "@/store/GameStateStore";

export interface FormationTabProps {
  onSetFormation: (formation: string) => Promise<void>;
}

const FORMATIONS = [
  "3-3-4", "3-4-3", "4-2-4", "4-3-3", "4-4-2", "4-5-1",
  "5-2-3", "5-3-2", "5-4-1", "5-5-0", "6-3-1", "6-4-0",
];

export default function FormationTab({ onSetFormation }: FormationTabProps) {
  const [formation, setFormation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { coachTeamId } = useGameState();

  const handleApply = async () => {
    if (!formation) return;

    if (!coachTeamId) {
      console.error("❌ Cannot set formation — coachTeamId is missing.");
      alert("Coach team is not loaded. Please reload the page.");
      return;
    }

    setLoading(true);
    try {
      console.log("✅ Setting formation for coachTeamId:", coachTeamId);
      await onSetFormation(formation);
    } catch (err) {
      console.error("Error applying formation:", err);
      alert("Failed to apply formation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-2 font-bold text-accent">Select Formation</p>
      <select
        className="mb-2 w-full rounded border p-1 text-black"
        value={formation ?? ""}
        onChange={(e) => setFormation(e.target.value)}
      >
        <option value="">-- Select --</option>
        {FORMATIONS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <button
        onClick={handleApply}
        disabled={!formation || loading}
        className={`mt-2 w-full rounded px-2 py-1 ${
          formation
            ? "bg-primary text-black hover:bg-yellow-400"
            : "cursor-not-allowed bg-gray-300"
        }`}
      >
        {loading ? "Setting Formation..." : "Confirm Formation"}
      </button>
    </div>
  );
}
