// frontend/src/components/teamroster/tabs/FormationTab.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/axios";
import { useGameState } from "@/store/GameStateStore";

export interface FormationTabProps {
  /** Should set the formation on the current match via your matchRoute */
  onSetFormation: (formation: string) => Promise<void>;
  /** The active save-game ID, passed down from parent */
  saveGameId: number;
}

const FORMATIONS = [
  "3-3-4","3-4-3","4-2-4","4-3-3","4-4-2","4-5-1",
  "5-2-3","5-3-2","5-4-1","5-5-0","6-3-1","6-4-0",
];

export default function FormationTab({
  onSetFormation,
  saveGameId,
}: FormationTabProps) {
  const [formation, setFormation] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { coachTeamId } = useGameState();

  const handleApply = async () => {
    if (!formation) return;

    if (!coachTeamId) {
      console.error("❌ Missing coachTeamId");
      alert("Coach team not loaded. Please reload.");
      return;
    }
    if (!saveGameId) {
      console.error("❌ Missing saveGameId");
      alert("Game not initialized. Please reload.");
      return;
    }

    setLoading(true);
    try {
      // 1) Set the formation on the match
      console.log(
        `✅ Setting formation "${formation}" for coachTeamId=${coachTeamId}`
      );
      await onSetFormation(formation);

      // 2) Advance into MATCHDAY
      const { data: midState } = await api.post(
        "/matchday/advance",
        { saveGameId }
      );

      // 3) Navigate when we see MATCHDAY
      if (midState.gameStage === "MATCHDAY") {
        navigate("/matchday-live");
      } else {
        console.error("Unexpected gameStage:", midState.gameStage);
        alert("Could not start match simulation");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to apply formation or start matchday");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-2 font-bold text-accent">Select Formation</p>

      <select
        className="mb-2 w-full rounded border p-1 text-black"
        value={formation}
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
        {loading ? "Starting Matchday..." : "Confirm & Play Match"}
      </button>
    </div>
  );
}
