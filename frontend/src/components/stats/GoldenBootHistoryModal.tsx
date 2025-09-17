// frontend/src/components/stats/GoldenBootHistoryModal.tsx
import * as React from "react";
import statsService, {
  type GoldenBootRow,
  type GoldenBootHistoryResponse,
} from "@/services/statsService";
import { useGameState } from "@/store/GameStateStore";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  limit?: number;
}

/** minimal slice we need from the GameState store */
type GameStateSlice = {
  saveGameId?: number;
  currentSaveGameId?: number;
};

export default function GoldenBootHistoryModal({ isOpen, onClose, limit = 10 }: Props) {
  const gs = useGameState() as unknown as GameStateSlice;
  const saveGameId = gs.saveGameId ?? gs.currentSaveGameId;

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<GoldenBootRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    if (!saveGameId) {
      setRows([]);
      setError("SaveGame not ready");
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    statsService
      .getGoldenBootHistory({ saveGameId, limit })
      .then((res: GoldenBootHistoryResponse) => {
        if (!mounted) return;
        setRows(res.top ?? []);
      })
      .catch((e) => {
        console.error(e);
        if (mounted) setError("Failed to load Golden Boot History");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isOpen, saveGameId, limit]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
      <AppCard className="w-full max-w-2xl bg-[#0b1a2b] text-white border border-yellow-400/40 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-lg uppercase text-yellow-300">Golden Boot History</h2>
          <AppButton onClick={onClose} className="bg-yellow-400 text-black hover:bg-yellow-500">
            Close
          </AppButton>
        </div>

        {loading && (
          <div className="py-6 text-center text-gray-200 font-mono">Loading…</div>
        )}

        {!loading && error && (
          <div className="py-6 text-red-300 font-mono">{error}</div>
        )}

        {!loading && !error && (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm font-mono">
              <thead className="sticky top-0 bg-black/30">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Player</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-left p-2">Pos</th>
                  <th className="text-right p-2">Goals (All Seasons)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-300">
                      No scorers yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={`${r.saveGamePlayerId ?? "base"}-${r.name}`} className="odd:bg-white/5">
                      <td className="p-2">{r.rank}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.teamName ?? "-"}</td>
                      <td className="p-2">{r.position ?? "-"}</td>
                      <td className="p-2 text-right">{r.goals}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>
    </div>
  );
}
